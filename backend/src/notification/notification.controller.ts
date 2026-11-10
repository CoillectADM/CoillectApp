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
import { JwtUserAuthGuard } from '../auth/guards/jwt-user.guard';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtUserAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('mine')
  @ApiOperation({
    summary:
      'Síndico: notificações (cópias informativas das solicitações do seu condomínio)',
  })
  @ApiQuery({ name: 'unread', required: false, example: 'true' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async mine(
    @Req() req: any,
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
  ): Promise<APIResponse> {
    const list = await this.notificationService.list({ userId: req.user.sub }, {
      unreadOnly: unread === 'true' || unread === '1',
      limit: limit ? Number(limit) || undefined : undefined,
    });
    return new APIResponse()
      .setData(list)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Notificações do síndico')
      .build();
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Síndico: marca todas as notificações como lidas' })
  async readAll(@Req() req: any): Promise<APIResponse> {
    const result = await this.notificationService.markAllRead({
      userId: req.user.sub,
    });
    return new APIResponse()
      .setData(result)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Notificações marcadas como lidas')
      .build();
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Síndico: marca uma notificação como lida' })
  async read(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<APIResponse> {
    const notification = await this.notificationService.markRead(id, {
      userId: req.user.sub,
    });
    return new APIResponse()
      .setData(notification)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Notificação marcada como lida')
      .build();
  }
}
