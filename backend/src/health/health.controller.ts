import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { APIResponse } from '../utils/response/response';

/** Verificação de saúde usada pela plataforma cloud e pelos apps ("testar servidor"). */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'API no ar? Banco conectado?' })
  async check(): Promise<APIResponse> {
    let database: 'up' | 'down' = 'up';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      database = 'down';
    }
    return new APIResponse()
      .setData({
        status: database === 'up' ? 'ok' : 'degraded',
        database,
        uptimeSeconds: Math.round(process.uptime()),
        version: process.env.npm_package_version || '2.0.0',
      })
      .setError(false)
      .setStatusCode(200)
      .setMessage('Coillect API')
      .build();
  }
}
