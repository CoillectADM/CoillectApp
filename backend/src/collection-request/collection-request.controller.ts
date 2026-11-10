// src/collection-request/collection-request.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CollectionRequestService } from './collection-request.service';
import { CreateCollectionRequestDto } from './dto/create-collection-request.dto';
import { AcceptCollectionRequestDto } from './dto/accept-collection-request.dto';
import { JwtUserAuthGuard } from 'src/auth/guards/jwt-user.guard';
import { JwtCompanyAuthGuard } from 'src/auth/guards/jwt-company.guard';
import { APIResponse } from 'src/utils/response/response';
import { toRequestView } from './collection-request.view';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';

function ok(data: unknown, message: string, statusCode = 200): APIResponse {
  return new APIResponse()
    .setData(data)
    .setError(false)
    .setStatusCode(statusCode)
    .setMessage(message)
    .build();
}

@ApiTags('collection-request')
@ApiBearerAuth()
@Controller('collection-request')
export class CollectionRequestController {
  constructor(
    private readonly collectionRequestService: CollectionRequestService,
  ) {}

  // ---------------------------------------------------------------
  // Síndico (app-mobile-sindico) — token de /auth/login
  // ---------------------------------------------------------------

  @UseGuards(JwtUserAuthGuard)
  @Get('my-active')
  @ApiOperation({
    summary:
      'Síndico: cópia da solicitação em aberto do seu condomínio (mesma solicitação enviada à empresa)',
  })
  async getMyActive(@Req() req: any): Promise<APIResponse> {
    const request = await this.collectionRequestService.getActiveForUser(
      req.user.sub,
    );
    return ok(
      request ? toRequestView(request) : null,
      request ? 'Solicitação ativa encontrada' : 'Nenhuma solicitação ativa',
    );
  }

  @UseGuards(JwtUserAuthGuard)
  @Get('my-history')
  @ApiOperation({
    summary: 'Síndico: histórico de solicitações encerradas',
  })
  async getMyHistory(@Req() req: any): Promise<APIResponse> {
    const list = await this.collectionRequestService.getUserHistory(
      req.user.sub,
    );
    return ok(list.map(toRequestView), 'Histórico de solicitações do usuário');
  }

  @UseGuards(JwtUserAuthGuard)
  @Post()
  @ApiOperation({
    summary:
      '[Fluxo antigo] Usuário cria uma solicitação manual escolhendo a empresa',
  })
  async create(
    @Req() req: any,
    @Body() dto: CreateCollectionRequestDto,
  ): Promise<APIResponse> {
    const request = await this.collectionRequestService.createForUser(
      req.user.sub,
      dto,
    );
    return ok(
      toRequestView(request),
      'Solicitação de coleta criada com sucesso',
      201,
    );
  }

  @UseGuards(JwtUserAuthGuard)
  @Post(':id/cancel')
  @ApiOperation({ summary: '[Fluxo antigo] Usuário cancela a solicitação' })
  @ApiParam({ name: 'id', description: 'ID da solicitação', example: 42 })
  async cancelForUser(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<APIResponse> {
    const request = await this.collectionRequestService.cancelForUser(
      id,
      req.user.sub,
    );
    return ok(toRequestView(request), 'Solicitação cancelada com sucesso');
  }

  @UseGuards(JwtUserAuthGuard)
  @Post(':id/complete')
  @ApiOperation({
    summary: '[Fluxo antigo] Usuário confirma que a coleta foi realizada',
  })
  @ApiParam({ name: 'id', description: 'ID da solicitação', example: 42 })
  async completeForUser(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<APIResponse> {
    const request = await this.collectionRequestService.completeForUser(
      id,
      req.user.sub,
    );
    return ok(toRequestView(request), 'Coleta concluída com sucesso');
  }

  // ---------------------------------------------------------------
  // Empresa coletora (app-mobile-empresa) — token de /auth/company/login
  // ---------------------------------------------------------------

  @UseGuards(JwtCompanyAuthGuard)
  @Get('company/active')
  @ApiOperation({
    summary:
      'Empresa: solicitações em aberto (PENDING = aguardando início, SCHEDULED = em andamento)',
  })
  async getCompanyActive(@Req() req: any): Promise<APIResponse> {
    const list = await this.collectionRequestService.getCompanyActiveRequests(
      req.user.sub,
    );
    return ok(list.map(toRequestView), 'Solicitações ativas da empresa');
  }

  @UseGuards(JwtCompanyAuthGuard)
  @Get('company/history')
  @ApiOperation({ summary: 'Empresa: histórico de solicitações encerradas' })
  async getCompanyHistory(@Req() req: any): Promise<APIResponse> {
    const list = await this.collectionRequestService.getCompanyHistory(
      req.user.sub,
    );
    return ok(list.map(toRequestView), 'Histórico de solicitações da empresa');
  }

  @UseGuards(JwtCompanyAuthGuard)
  @Post(':id/accept')
  @ApiOperation({
    summary: 'Empresa: "Iniciar etapa de coleta" (PENDING → SCHEDULED)',
  })
  @ApiParam({ name: 'id', description: 'ID da solicitação', example: 42 })
  async accept(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AcceptCollectionRequestDto,
  ): Promise<APIResponse> {
    const request = await this.collectionRequestService.acceptRequest(
      id,
      req.user.sub,
      dto?.scheduledDate ? new Date(dto.scheduledDate) : undefined,
    );
    return ok(toRequestView(request), 'Etapa de coleta iniciada');
  }

  @UseGuards(JwtCompanyAuthGuard)
  @Post(':id/company-complete')
  @ApiOperation({
    summary:
      'Empresa: conclui a coleta (→ COMPLETED). O barril volta a 0% e o síndico é notificado',
  })
  @ApiParam({ name: 'id', description: 'ID da solicitação', example: 42 })
  async completeByCompany(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<APIResponse> {
    const request = await this.collectionRequestService.completeByCompany(
      id,
      req.user.sub,
    );
    return ok(toRequestView(request), 'Coleta concluída');
  }

  @UseGuards(JwtCompanyAuthGuard)
  @Post(':id/refuse')
  @ApiOperation({ summary: 'Empresa: recusa a solicitação (→ REFUSED)' })
  @ApiParam({ name: 'id', description: 'ID da solicitação', example: 42 })
  async refuse(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<APIResponse> {
    const request = await this.collectionRequestService.refuseRequest(
      id,
      req.user.sub,
    );
    return ok(toRequestView(request), 'Solicitação recusada');
  }
}
