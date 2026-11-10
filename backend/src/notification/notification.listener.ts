import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainEventsService } from '../events/domain-events.service';
import {
  COLLECTION_REQUEST_CREATED,
  COLLECTION_REQUEST_STATUS_CHANGED,
  CollectionRequestCreatedEvent,
  CollectionRequestStatusChangedEvent,
} from '../events/domain-events';
import { CollectionRequest } from '../collection-request/collection-request.entity';
import { ReceiptService } from '../collection-request/receipt.service';
import {
  CoillectMessage,
  DeliveryInfo,
  MessageQueueService,
  QueueEnvelope,
} from '../cloud/message-queue.service';
import { logEvent } from '../cloud/telemetry';
import { NotificationType } from './notification.entity';
import { NotificationService } from './notification.service';

const TYPE_BY_STATUS: Partial<Record<string, NotificationType>> = {
  SCHEDULED: 'COLLECTION_SCHEDULED',
  COMPLETED: 'COLLECTION_COMPLETED',
  REFUSED: 'COLLECTION_REFUSED',
  CANCELLED: 'COLLECTION_CANCELLED',
};

/**
 * Notificações via FILA (Azure Queue Storage, ou em memória sem Azure).
 *
 * 1. Quando a solicitação é criada ou muda de status, este listener publica uma
 *    mensagem na fila "coillect-notificacoes" — a solicitação já está gravada e
 *    a resposta ao sensor/app não espera a entrega dos avisos.
 * 2. O consumidor da fila (handle) gera:
 *    - empresa: aviso de nova solicitação (faixa laranja do app) e de cancelamento;
 *    - síndico: cópia informativa de tudo o que acontece com a coleta;
 *    - coleta concluída: o comprovante no Blob Storage (container comprovantes-coleta);
 *    - "Precisa de ajuda?": aviso para a empresa e confirmação para o síndico.
 * As gravações usam o id da mensagem como chave de idempotência.
 */
@Injectable()
export class NotificationListener implements OnModuleInit {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly events: DomainEventsService,
    private readonly notifications: NotificationService,
    private readonly queue: MessageQueueService,
    private readonly receipts: ReceiptService,
    @InjectRepository(CollectionRequest)
    private readonly requests: Repository<CollectionRequest>,
  ) {}

  onModuleInit(): void {
    this.events.on<CollectionRequestCreatedEvent>(
      COLLECTION_REQUEST_CREATED,
      ({ request }) => {
        logEvent('solicitacao_criada', {
          requestId: request.id,
          origem: request.origin ?? 'MANUAL',
          status: request.status,
          nivel: request.levelAtRequest ?? null,
          condominio: condominiumName(request),
          barril: request.barrel?.code ?? null,
          empresa: request.company?.name ?? null,
        });
        return this.publish({
          tipo: 'coleta.criada',
          requestId: request.id,
          status: request.status,
          origem: request.origin ?? 'MANUAL',
        });
      },
    );
    this.events.on<CollectionRequestStatusChangedEvent>(
      COLLECTION_REQUEST_STATUS_CHANGED,
      ({ request, previousStatus }) => {
        logEvent('solicitacao_status', {
          requestId: request.id,
          de: previousStatus,
          para: request.status,
          condominio: condominiumName(request),
          empresa: request.company?.name ?? null,
        });
        return this.publish({
          tipo: 'coleta.status',
          requestId: request.id,
          status: request.status,
          statusAnterior: previousStatus,
        });
      },
    );
    this.queue.subscribe((message, info) => this.handle(message, info));
  }

  /** Falhas na publicação nunca desfazem a solicitação principal. */
  private async publish(message: CoillectMessage): Promise<void> {
    try {
      await this.queue.publish(message);
    } catch (error) {
      this.logger.error(`Falha ao publicar ${message.tipo} na fila: ${error}`);
    }
  }

  /** Consumidor da fila. Se lançar erro, a mensagem volta para a fila (Azure). */
  async handle(message: QueueEnvelope, _info?: DeliveryInfo): Promise<void> {
    switch (message.tipo) {
      case 'coleta.criada': {
        const request = await this.load(message.requestId);
        if (!request) return;
        await this.onCreated(request, message.id);
        return;
      }
      case 'coleta.status': {
        const request = await this.load(message.requestId);
        if (!request) return;
        await this.onStatusChanged(request, message.status, message.id);
        return;
      }
      case 'ajuda.solicitada':
        await this.notifications.notificarAjuda(message, message.id);
        return;
      default:
        this.logger.warn(`Mensagem desconhecida na fila: ${JSON.stringify(message)}`);
    }
  }

  /** A solicitação pode ter sido apagada (ex.: "Reiniciar demonstração"). */
  private async load(id: number): Promise<CollectionRequest | null> {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) this.logger.warn(`Solicitação #${id} não existe mais; mensagem ignorada.`);
    return request;
  }

  private async onCreated(request: CollectionRequest, key: string): Promise<void> {
    if (request.origin === 'COMPANY') {
      // A própria empresa agendou: só o síndico precisa saber.
      await this.all([
        () => this.notifications.notificarSindico(request, 'COLLECTION_SCHEDULED', `${key}:SINDICO`),
      ]);
      return;
    }
    await this.all([
      () => this.notifications.notificarEmpresa(request, 'COLLECTION_REQUESTED', `${key}:EMPRESA`),
      () => this.notifications.notificarSindico(request, 'COLLECTION_REQUESTED', `${key}:SINDICO`),
    ]);
  }

  private async onStatusChanged(
    request: CollectionRequest,
    status: string,
    key: string,
  ): Promise<void> {
    const type = TYPE_BY_STATUS[status];
    if (!type) return;
    const work: Array<() => Promise<unknown>> = [
      () => this.notifications.notificarSindico(request, type, `${key}:SINDICO`),
    ];
    if (status === 'CANCELLED') {
      work.push(() => this.notifications.notificarEmpresa(request, type, `${key}:EMPRESA`));
    }
    if (status === 'COMPLETED') {
      work.push(() => this.receipts.generate(request.id));
    }
    await this.all(work);
  }

  /** Executa tudo; se algo falhar, os demais seguem e o erro sobe no final. */
  private async all(work: Array<() => Promise<unknown>>): Promise<void> {
    const errors: unknown[] = [];
    for (const step of work) {
      try {
        await step();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) {
      throw errors.length === 1 ? errors[0] : new Error(errors.map(String).join(' | '));
    }
  }
}

function condominiumName(request: CollectionRequest): string | null {
  return (request.barrel ?? request.sensor?.barrel)?.condominium?.name ?? null;
}
