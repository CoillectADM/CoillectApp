import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AzureQueue, ReceivedQueueMessage, parseConnectionString } from './azure-storage.client';
import { CloudConfig, cloudConfigFromEnv } from './cloud.config';
import { logEvent } from './telemetry';

/**
 * Mensagens da fila "coillect-notificacoes". A solicitação de coleta é gravada
 * na hora (o sensor recebe a resposta); a fila leva o "recado" para quem
 * precisa ser avisado: empresa coletora (nova solicitação), síndico (cópia
 * informativa) e o comprovante da coleta concluída no Blob Storage.
 */
export type CoillectMessage =
  | {
      tipo: 'coleta.criada';
      requestId: number;
      status: string;
      origem: string;
    }
  | {
      tipo: 'coleta.status';
      requestId: number;
      status: string;
      statusAnterior: string;
    }
  | {
      tipo: 'ajuda.solicitada';
      sindicoId: number;
      companyId: number;
      sindico: string;
      condominio: string;
      empresa: string;
      assunto: string;
      mensagem: string;
    };

export type QueueEnvelope = CoillectMessage & {
  id: string;
  versao: 1;
  enviadaEm: string;
};

export interface DeliveryInfo {
  /** Quantas vezes a mensagem já foi entregue (1 = primeira tentativa). */
  dequeueCount: number;
  via: 'azure-queue' | 'memoria' | 'fallback-local';
}

export type QueueHandler = (message: QueueEnvelope, info: DeliveryInfo) => Promise<void>;

export interface QueueStats {
  provider: string;
  account: string | null;
  endpoint: string | null;
  name: string;
  poisonQueue: string | null;
  published: number;
  processed: number;
  failed: number;
  poisoned: number;
  fallbacks: number;
  lastPublishedAt: string | null;
  lastProcessedAt: string | null;
  lastError: string | null;
  pollMs: number | null;
}

/**
 * Fila de mensagens da Coillect.
 *  - modo azure: Azure Queue Storage (ou Azurite). Um consumidor dentro da API
 *    lê a fila, processa e apaga a mensagem; se falhar, a mensagem volta e é
 *    tentada de novo; depois de N falhas vai para a fila "-poison".
 *  - modo local: a mensagem é processada na hora, em memória (sem Azure).
 * Os consumidores devem ser idempotentes (a fila entrega "pelo menos uma vez").
 */
@Injectable()
export class MessageQueueService implements OnApplicationShutdown {
  private readonly logger = new Logger(MessageQueueService.name);
  private readonly config: CloudConfig;
  private readonly queue: AzureQueue | null;
  private readonly poison: AzureQueue | null;
  private handler: QueueHandler | null = null;
  private ready: Promise<void> | null = null;
  private timer: NodeJS.Timeout | null = null;
  private polling = false;
  private stopped = true;
  /** Consumidor pausado (demonstração): mensagens ficam esperando na fila do Azure. */
  private paused = false;
  private delay: number;
  private readonly stats = {
    published: 0,
    processed: 0,
    failed: 0,
    poisoned: 0,
    fallbacks: 0,
    lastPublishedAt: null as string | null,
    lastProcessedAt: null as string | null,
    lastError: null as string | null,
  };

  constructor() {
    this.config = cloudConfigFromEnv();
    if (this.config.mode === 'azure') {
      const account = parseConnectionString(this.config.connectionString);
      this.queue = new AzureQueue(account, this.config.queue);
      this.poison = new AzureQueue(account, this.config.poisonQueue);
    } else {
      this.queue = null;
      this.poison = null;
    }
    this.delay = this.config.pollMs;
  }

  get mode(): 'azure' | 'local' {
    return this.config.mode;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /**
   * Pausa/retoma o consumidor da fila do Azure. Serve para mostrar na aula que
   * o sensor e a solicitação continuam funcionando enquanto os avisos esperam
   * na fila — e são entregues quando o consumidor volta.
   */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) this.kick();
  }

  /** Um único consumidor (o despachante de notificações) processa todas as mensagens. */
  subscribe(handler: QueueHandler): void {
    this.handler = handler;
  }

  async publish(message: CoillectMessage): Promise<void> {
    const envelope: QueueEnvelope = {
      ...message,
      id: randomUUID(),
      versao: 1,
      enviadaEm: new Date().toISOString(),
    };
    this.stats.published++;
    this.stats.lastPublishedAt = envelope.enviadaEm;

    if (!this.queue) {
      await this.process(envelope, { dequeueCount: 1, via: 'memoria' });
      return;
    }
    try {
      await this.ensureReady();
      const messageId = await this.queue.send(JSON.stringify(envelope));
      logEvent('fila_mensagem_enviada', {
        tipo: envelope.tipo,
        fila: this.config.queue,
        mensagemId: messageId,
        ...requestIdOf(envelope),
      });
      // Esta instância acabou de publicar: lê a fila logo em seguida.
      this.kick();
    } catch (error) {
      // Azure fora do ar: não perde o aviso; processa aqui mesmo e registra.
      this.stats.fallbacks++;
      this.stats.lastError = String(error);
      logEvent('fila_indisponivel', { tipo: envelope.tipo, erro: String(error) });
      this.logger.error(`Fila indisponível (${error}); processando a mensagem localmente.`);
      await this.process(envelope, { dequeueCount: 1, via: 'fallback-local' });
    }
  }

  async status(): Promise<QueueStats & { paused: boolean; waiting: number | null }> {
    let waiting: number | null = this.queue ? null : 0;
    let lastError = this.stats.lastError;
    if (this.queue) {
      try {
        await this.ensureReady();
        waiting = await this.queue.approximateCount();
      } catch (error) {
        lastError = String(error);
      }
    }
    const account = this.queue?.account;
    return {
      provider: this.queue
        ? account.emulator
          ? 'Azure Queue Storage (emulador Azurite)'
          : 'Azure Queue Storage'
        : 'Memória (sem Azure)',
      account: account?.accountName ?? null,
      endpoint: account?.queueEndpoint ?? null,
      name: this.config.queue,
      poisonQueue: this.poison ? this.config.poisonQueue : null,
      published: this.stats.published,
      processed: this.stats.processed,
      failed: this.stats.failed,
      poisoned: this.stats.poisoned,
      fallbacks: this.stats.fallbacks,
      lastPublishedAt: this.stats.lastPublishedAt,
      lastProcessedAt: this.stats.lastProcessedAt,
      lastError,
      pollMs: this.queue ? this.config.pollMs : null,
      paused: this.paused,
      waiting,
    };
  }

  /** Liga o consumidor da fila (chamado depois que todos os módulos subiram). */
  async start(): Promise<void> {
    if (!this.queue) {
      this.logger.log('Fila em memória (defina AZURE_STORAGE_CONNECTION_STRING para usar o Azure).');
      logEvent('armazenamento_iniciado', { servico: 'fila', modo: 'local' });
      return;
    }
    this.stopped = false;
    try {
      await this.ensureReady();
      logEvent('armazenamento_iniciado', {
        servico: 'fila',
        modo: 'azure',
        fila: this.config.queue,
        conta: this.queue.account.accountName,
      });
      this.logger.log(
        `Consumidor da fila ${this.config.queue} ligado (${this.queue.account.queueEndpoint}).`,
      );
    } catch (error) {
      this.stats.lastError = String(error);
      this.logger.error(`Fila indisponível agora (${error}); tentando de novo em segundo plano.`);
    }
    this.schedule(0);
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Lê a fila uma vez (também usado nos testes). Devolve quantas mensagens tratou. */
  async pollOnce(): Promise<number> {
    if (!this.queue || this.polling) return 0;
    this.polling = true;
    try {
      await this.ensureReady();
      const messages = await this.queue.receive(16, 30);
      for (const message of messages) {
        await this.handleReceived(message);
      }
      return messages.length;
    } finally {
      this.polling = false;
    }
  }

  private async handleReceived(message: ReceivedQueueMessage): Promise<void> {
    let envelope: QueueEnvelope | null = null;
    try {
      envelope = JSON.parse(message.text) as QueueEnvelope;
    } catch {
      envelope = null;
    }
    if (!envelope || typeof envelope.tipo !== 'string') {
      await this.moveToPoison(message, 'mensagem não é um JSON da Coillect');
      return;
    }
    if (message.dequeueCount > this.config.maxDequeueCount) {
      await this.moveToPoison(message, `falhou ${message.dequeueCount - 1} vezes`);
      return;
    }
    const ok = await this.process(envelope, {
      dequeueCount: message.dequeueCount,
      via: 'azure-queue',
    });
    if (ok) {
      // Só apaga depois de processar: se a API cair no meio, a mensagem volta.
      await this.queue.delete(message.messageId, message.popReceipt);
    }
  }

  private async moveToPoison(message: ReceivedQueueMessage, reason: string): Promise<void> {
    this.stats.poisoned++;
    logEvent('fila_mensagem_descartada', {
      fila: this.config.queue,
      mensagemId: message.messageId,
      tentativas: message.dequeueCount,
      motivo: reason,
    });
    this.logger.warn(`Mensagem ${message.messageId} movida para ${this.config.poisonQueue}: ${reason}`);
    await this.poison.createIfNotExists();
    await this.poison.send(message.text);
    await this.queue.delete(message.messageId, message.popReceipt);
  }

  /** Executa o consumidor. true = processada (pode apagar da fila). */
  private async process(envelope: QueueEnvelope, info: DeliveryInfo): Promise<boolean> {
    if (!this.handler) {
      this.logger.warn(`Mensagem ${envelope.tipo} sem consumidor registrado.`);
      return false;
    }
    const started = Date.now();
    try {
      await this.handler(envelope, info);
      this.stats.processed++;
      this.stats.lastProcessedAt = new Date().toISOString();
      logEvent('fila_mensagem_processada', {
        tipo: envelope.tipo,
        via: info.via,
        tentativas: info.dequeueCount,
        ms: Date.now() - started,
        ...requestIdOf(envelope),
      });
      return true;
    } catch (error) {
      this.stats.failed++;
      this.stats.lastError = String(error);
      logEvent('fila_mensagem_erro', {
        tipo: envelope.tipo,
        via: info.via,
        tentativas: info.dequeueCount,
        erro: String(error),
        ...requestIdOf(envelope),
      });
      // Na fila do Azure a mensagem volta e é tentada de novo; em memória o erro
      // fica registrado e não desfaz a solicitação principal (como antes).
      this.logger.error(`Falha ao processar ${envelope.tipo} (tentativa ${info.dequeueCount}): ${error}`);
      return false;
    }
  }

  private ensureReady(): Promise<void> {
    if (!this.queue) return Promise.resolve();
    if (!this.ready) {
      this.ready = this.queue
        .createIfNotExists()
        .then(() => undefined)
        .catch((error) => {
          this.ready = null;
          throw error;
        });
    }
    return this.ready;
  }

  private kick(): void {
    if (this.stopped || this.paused) return;
    this.delay = this.config.pollMs;
    this.schedule(50);
  }

  private schedule(ms: number): void {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), ms);
    this.timer.unref?.();
  }

  private async tick(): Promise<void> {
    this.timer = null;
    if (this.stopped) return;
    if (this.paused) {
      this.schedule(this.config.pollMaxMs);
      return;
    }
    if (this.polling) {
      this.schedule(this.config.pollMs);
      return;
    }
    try {
      const handled = await this.pollOnce();
      // Fila vazia: espaça as leituras (até pollMaxMs) para gastar menos transações.
      this.delay = handled > 0 ? this.config.pollMs : Math.min(this.delay * 2, this.config.pollMaxMs);
    } catch (error) {
      this.stats.lastError = String(error);
      this.delay = this.config.pollMaxMs;
      this.logger.warn(`Leitura da fila falhou: ${error}`);
    }
    this.schedule(this.delay);
  }
}

function requestIdOf(message: CoillectMessage): Record<string, unknown> {
  return 'requestId' in message ? { requestId: message.requestId } : {};
}
