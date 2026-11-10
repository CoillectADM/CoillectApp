import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { APIResponse } from '../utils/response/response';
import { MessageQueueService } from '../cloud/message-queue.service';

/**
 * Verificação de saúde usada pela plataforma cloud (Health check do App Service,
 * teste de disponibilidade do Application Insights, Render) e pelos apps.
 * Responde 503 quando o banco está fora: a plataforma tira a instância do
 * balanceador até ela voltar (alta disponibilidade com 2+ instâncias).
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly queue: MessageQueueService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'API no ar? Banco conectado?' })
  @ApiResponse({ status: 200, description: 'API e banco funcionando' })
  @ApiResponse({ status: 503, description: 'API no ar, mas sem acesso ao banco' })
  async check(@Res({ passthrough: true }) res: any): Promise<APIResponse> {
    let database: 'up' | 'down' = 'up';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      database = 'down';
    }
    const statusCode = database === 'up' ? 200 : 503;
    res.status(statusCode);
    return new APIResponse()
      .setData({
        status: database === 'up' ? 'ok' : 'degraded',
        database,
        // azure = Blob + Queue no Azure Storage; local = sem Azure (disco + memória).
        storage: this.queue.mode,
        queuePaused: this.queue.isPaused,
        uptimeSeconds: Math.round(process.uptime()),
      })
      .setError(database !== 'up')
      .setStatusCode(statusCode)
      .setMessage('Coillect API')
      .build();
  }
}
