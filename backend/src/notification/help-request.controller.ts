import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { APIResponse } from '../utils/response/response';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user.guard';
import { Condominium } from '../sensor/entities/condominium.entity';
import { MessageQueueService } from '../cloud/message-queue.service';
import { logEvent } from '../cloud/telemetry';
import { HelpRequestDto } from './help-request.dto';

/** "Precisa de ajuda?" (app-mobile-sindico): mensagem para a empresa coletora, via fila. */
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtUserAuthGuard)
@Controller('help-request')
export class HelpRequestController {
  constructor(
    @InjectRepository(Condominium)
    private readonly condominiums: Repository<Condominium>,
    private readonly queue: MessageQueueService,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary:
      'Síndico: "Precisa de ajuda?" — envia uma mensagem à empresa coletora do condomínio (aviso no app da empresa)',
  })
  async create(@Req() req: any, @Body() dto: HelpRequestDto): Promise<APIResponse> {
    const condominium = await this.condominiums.findOne({
      where: { sindico: { id: req.user.sub } },
      relations: { sindico: true, company: true },
      order: { id: 'ASC' },
    });
    if (!condominium) {
      throw new NotFoundException('Nenhum condomínio vinculado a este síndico.');
    }
    if (!condominium.company) {
      throw new ConflictException(
        `${condominium.name} ainda não tem empresa coletora vinculada. Peça ao administrador para vincular.`,
      );
    }
    const topic = dto.topic ?? 'OUTRO';
    await this.queue.publish({
      tipo: 'ajuda.solicitada',
      sindicoId: req.user.sub,
      companyId: condominium.company.id,
      sindico: condominium.sindico?.name ?? 'Síndico',
      condominio: condominium.name,
      empresa: condominium.company.name,
      assunto: topic,
      mensagem: dto.message.trim(),
    });
    logEvent('ajuda_solicitada', {
      condominio: condominium.name,
      empresa: condominium.company.name,
      assunto: topic,
    });
    return new APIResponse()
      .setData({
        sent: true,
        company: condominium.company.name,
        condominium: condominium.name,
        topic,
        delivery: this.queue.mode === 'azure' ? 'azure-queue' : 'local',
      })
      .setError(false)
      .setStatusCode(201)
      .setMessage(`Pedido de ajuda enviado para ${condominium.company.name}`)
      .build();
  }
}
