import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { APIResponse } from '../utils/response/response';
import { JwtCompanyAuthGuard } from '../auth/guards/jwt-company.guard';
import { NotificationService } from './notification.service';

function ok(data: unknown, message: string): APIResponse {
  return new APIResponse()
    .setData(data)
    .setError(false)
    .setStatusCode(200)
    .setMessage(message)
    .build();
}

/** Avisos da empresa coletora (app-mobile-empresa) — token de /auth/company/login. */
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtCompanyAuthGuard)
@Controller('notifications/company')
export class CompanyNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary:
      'Empresa: avisos de novas solicitações de coleta (ex.: "Residencial Aurora chegou a 86% de capacidade.")',
  })
  @ApiQuery({ name: 'unread', required: false, example: 'true' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async list(
    @Req() req: any,
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
  ): Promise<APIResponse> {
    const list = await this.notificationService.list(
      { companyId: req.user.sub },
      {
        unreadOnly: unread === 'true' || unread === '1',
        limit: limit ? Number(limit) || undefined : undefined,
      },
    );
    return ok(list, 'Avisos da empresa');
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Empresa: marca todos os avisos como lidos' })
  async readAll(@Req() req: any): Promise<APIResponse> {
    return ok(
      await this.notificationService.markAllRead({ companyId: req.user.sub }),
      'Avisos marcados como lidos',
    );
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Empresa: marca um aviso como lido' })
  async read(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<APIResponse> {
    return ok(
      await this.notificationService.markRead(id, { companyId: req.user.sub }),
      'Aviso marcado como lido',
    );
  }
}
