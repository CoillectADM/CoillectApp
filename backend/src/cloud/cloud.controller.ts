import { ConflictException, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { APIResponse } from '../utils/response/response';
import { BlobStorageService } from './blob-storage.service';
import { MessageQueueService } from './message-queue.service';

/** Painel "Nuvem" do desktop administrativo (sem login no MVP, como as demais rotas admin). */
@ApiTags('admin')
@Controller('admin/cloud')
export class CloudController {
  constructor(
    private readonly blobs: BlobStorageService,
    private readonly queue: MessageQueueService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Desktop: estado do Azure Storage — Blob (comprovantes de coleta) e Queue (fila de notificações)',
  })
  async status(): Promise<APIResponse> {
    const [blob, queue] = await Promise.all([this.blobs.status(10), this.queue.status()]);
    return new APIResponse()
      .setData({ mode: this.queue.mode, blob, queue })
      .setError(false)
      .setStatusCode(200)
      .setRequester('admin')
      .setMessage(
        this.queue.mode === 'azure'
          ? 'Azure Storage conectado'
          : 'Modo local (defina AZURE_STORAGE_CONNECTION_STRING para usar o Azure)',
      )
      .build();
  }

  @Post('queue/pause')
  @ApiOperation({
    summary:
      'Demonstração: pausa o consumidor da fila do Azure (os avisos ficam esperando na fila)',
  })
  pause(): APIResponse {
    return this.setPaused(true);
  }

  @Post('queue/resume')
  @ApiOperation({ summary: 'Demonstração: retoma o consumidor da fila (entrega o que estava esperando)' })
  resume(): APIResponse {
    return this.setPaused(false);
  }

  private setPaused(paused: boolean): APIResponse {
    if (this.queue.mode !== 'azure') {
      throw new ConflictException(
        'Pausar a fila só faz sentido com o Azure Storage (no modo local a fila é em memória).',
      );
    }
    this.queue.setPaused(paused);
    return new APIResponse()
      .setData({ paused: this.queue.isPaused })
      .setError(false)
      .setStatusCode(201)
      .setRequester('admin')
      .setMessage(paused ? 'Consumidor da fila pausado' : 'Consumidor da fila retomado')
      .build();
  }
}
