import { Global, Module, OnApplicationBootstrap } from '@nestjs/common';
import { BlobStorageService } from './blob-storage.service';
import { MessageQueueService } from './message-queue.service';
import { CloudController } from './cloud.controller';

/**
 * Armazenamento em nuvem (Atividade A02): Blob Storage (comprovantes de coleta)
 * e Queue Storage (fila de notificações). Global para qualquer módulo usar.
 */
@Global()
@Module({
  controllers: [CloudController],
  providers: [BlobStorageService, MessageQueueService],
  exports: [BlobStorageService, MessageQueueService],
})
export class CloudModule implements OnApplicationBootstrap {
  constructor(
    private readonly blobs: BlobStorageService,
    private readonly queue: MessageQueueService,
  ) {}

  /** Depois que todos os módulos registraram seus consumidores. */
  async onApplicationBootstrap(): Promise<void> {
    await this.blobs.start();
    await this.queue.start();
  }
}
