import { ReceivedQueueMessage } from './azure-storage.client';
import { MessageQueueService, QueueEnvelope } from './message-queue.service';

/** Fila falsa no lugar do Azure Queue Storage (o e2e do CI usa o Azurite de verdade). */
class FakeQueue {
  account = {
    accountName: 'devstoreaccount1',
    emulator: true,
    queueEndpoint: 'http://fila-falsa',
  };
  inbox: ReceivedQueueMessage[] = [];
  sent: string[] = [];
  deleted: string[] = [];
  failSend = false;

  async createIfNotExists() {
    return true;
  }

  async send(text: string) {
    if (this.failSend) throw new Error('Azure fora do ar');
    this.sent.push(text);
    return `id-${this.sent.length}`;
  }

  async receive() {
    const out = this.inbox;
    this.inbox = [];
    return out;
  }

  async delete(id: string) {
    this.deleted.push(id);
  }

  async approximateCount() {
    return this.inbox.length;
  }
}

const message = { tipo: 'coleta.criada' as const, requestId: 7, status: 'PENDING', origem: 'SENSOR' };

function received(text: string, dequeueCount = 1, id = 'm1'): ReceivedQueueMessage {
  return { messageId: id, popReceipt: `pop-${id}`, dequeueCount, insertionTime: null, text };
}

describe('MessageQueueService', () => {
  const original = process.env.AZURE_STORAGE_CONNECTION_STRING;
  afterEach(() => {
    if (original === undefined) delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    else process.env.AZURE_STORAGE_CONNECTION_STRING = original;
  });

  describe('modo local (sem Azure)', () => {
    beforeEach(() => delete process.env.AZURE_STORAGE_CONNECTION_STRING);

    it('processa a mensagem na hora, em memória', async () => {
      const service = new MessageQueueService();
      const seen: Array<{ message: QueueEnvelope; via: string }> = [];
      service.subscribe(async (m, info) => {
        seen.push({ message: m, via: info.via });
      });
      await service.publish(message);
      expect(service.mode).toBe('local');
      expect(seen).toHaveLength(1);
      expect(seen[0].via).toBe('memoria');
      expect(seen[0].message).toMatchObject({ ...message, versao: 1 });
      expect(seen[0].message.id).toMatch(/[0-9a-f-]{36}/);
      const status = await service.status();
      expect(status).toMatchObject({ provider: 'Memória (sem Azure)', published: 1, processed: 1, waiting: 0 });
    });

    it('erro no consumidor fica registrado e não derruba quem publicou', async () => {
      const service = new MessageQueueService();
      service.subscribe(async () => {
        throw new Error('banco indisponível');
      });
      await expect(service.publish(message)).resolves.toBeUndefined();
      expect((await service.status()).failed).toBe(1);
    });
  });

  describe('modo azure (fila falsa)', () => {
    let service: MessageQueueService;
    let queue: FakeQueue;
    let poison: FakeQueue;
    let handled: QueueEnvelope[];

    beforeEach(() => {
      process.env.AZURE_STORAGE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
      service = new MessageQueueService();
      queue = new FakeQueue();
      poison = new FakeQueue();
      (service as any).queue = queue;
      (service as any).poison = poison;
      handled = [];
      service.subscribe(async (m) => {
        handled.push(m);
      });
    });

    it('publicar só envia para a fila; o consumidor processa e apaga depois', async () => {
      await service.publish(message);
      expect(service.mode).toBe('azure');
      expect(handled).toHaveLength(0);
      expect(queue.sent).toHaveLength(1);
      expect(JSON.parse(queue.sent[0])).toMatchObject(message);

      queue.inbox.push(received(queue.sent[0]));
      await expect(service.pollOnce()).resolves.toBe(1);
      expect(handled).toHaveLength(1);
      expect(queue.deleted).toEqual(['m1']);
    });

    it('falha no consumidor: a mensagem NÃO é apagada (volta para a fila)', async () => {
      service.subscribe(async () => {
        throw new Error('falhou');
      });
      queue.inbox.push(received(JSON.stringify({ ...message, id: 'x', versao: 1 })));
      await service.pollOnce();
      expect(queue.deleted).toEqual([]);
      expect((await service.status()).failed).toBe(1);
    });

    it('depois de muitas tentativas vai para a poison queue', async () => {
      queue.inbox.push(received(JSON.stringify({ ...message, id: 'x', versao: 1 }), 6, 'm9'));
      await service.pollOnce();
      expect(handled).toHaveLength(0);
      expect(poison.sent).toHaveLength(1);
      expect(queue.deleted).toEqual(['m9']);
      expect((await service.status()).poisoned).toBe(1);
    });

    it('mensagem que não é JSON da Coillect vai direto para a poison queue', async () => {
      queue.inbox.push(received('isto não é JSON', 1, 'm2'));
      await service.pollOnce();
      expect(poison.sent).toEqual(['isto não é JSON']);
      expect(queue.deleted).toEqual(['m2']);
    });

    it('Azure fora do ar na publicação: processa localmente e registra o fallback', async () => {
      queue.failSend = true;
      await service.publish(message);
      expect(handled).toHaveLength(1);
      const status = await service.status();
      expect(status.fallbacks).toBe(1);
      expect(status.lastError).toContain('Azure fora do ar');
    });
  });
});
