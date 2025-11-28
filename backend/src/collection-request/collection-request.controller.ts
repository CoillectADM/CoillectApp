import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import { CollectionRequestService } from './collection-request.service';
import { CreateCollectionRequestDto } from '../collection-request/dto/create-collection-request.dto';
import { JwtUserAuthGuard } from 'src/auth/guards/jwt-user.guard';
import { JwtCompanyAuthGuard } from '../auth/guards/jwt-company.guard';
import { APIResponse } from 'src/utils/response/response';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('collection-request')
@ApiBearerAuth()
@Controller('collection-request')
export class CollectionRequestController {
  constructor(
    private readonly collectionRequestService: CollectionRequestService,
  ) {}

  @UseGuards(JwtUserAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Cria uma solicitação de coleta para o usuário logado' })
  async create(
    @Req() req: any,
    @Body() dto: CreateCollectionRequestDto,
  ): Promise<APIResponse> {
    const userId = req.user.sub;

    const request = await this.collectionRequestService.createForUser(
      userId,
      dto,
    );

    return new APIResponse()
      .setData(request)
      .setError(false)
      .setStatusCode(201)
      .setMessage('Solicitação de coleta criada com sucesso')
      .build();
  }

  @UseGuards(JwtUserAuthGuard)
  @Get('my-active')
  @ApiOperation({ summary: 'Retorna a solicitação ativa do usuário logado' })
  async getMyActive(@Req() req: any): Promise<APIResponse> {
    const userId = req.user.sub;

    const request = await this.collectionRequestService.getActiveForUser(
      userId,
    );

    return new APIResponse()
      .setData(request)
      .setError(false)
      .setStatusCode(200)
      .setMessage(
        request ? 'Solicitação ativa encontrada' : 'Nenhuma solicitação ativa',
      )
      .build();
  }

    @UseGuards(JwtUserAuthGuard)
    @Get('my-history')
    @ApiOperation({ summary: 'Lista histórico de solicitações encerradas do usuário logado' })
    async getMyHistory(@Req() req: any): Promise<APIResponse> {
      const userId = req.user.sub;
      const list = await this.collectionRequestService.getUserHistory(userId);

      return new APIResponse()
        .setData(list)
        .setError(false)
        .setStatusCode(200)
        .setMessage('Histórico de solicitações do usuário')
        .build();
    }

  @UseGuards(JwtUserAuthGuard)
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancela a solicitação do usuário logado' })
  async cancelForUser(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<APIResponse> {
    const userId = req.user.sub;
    const request = await this.collectionRequestService.cancelForUser(
      Number(id),
      userId,
    );

    return new APIResponse()
      .setData(request)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Solicitação cancelada com sucesso')
      .build();
  }

  @UseGuards(JwtUserAuthGuard)
  @Post(':id/complete')
  @ApiOperation({ summary: 'Usuário confirma que a coleta foi realizada' })
  async completeForUser(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<APIResponse> {
    const userId = req.user.sub;
    const request = await this.collectionRequestService.completeForUser(
      Number(id),
      userId,
    );

    return new APIResponse()
      .setData(request)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Coleta concluída com sucesso')
      .build();
  }

  @UseGuards(JwtCompanyAuthGuard)
  @Get('company/active')
  @ApiOperation({ summary: 'Lista solicitações pendentes da empresa logada' })
  async getCompanyActive(@Req() req: any): Promise<APIResponse> {
    const companyId = req.user.sub;
    const list =
      await this.collectionRequestService.getCompanyActiveRequests(companyId);

    return new APIResponse()
      .setData(list)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Solicitações ativas da empresa')
      .build();
  }

    @UseGuards(JwtCompanyAuthGuard)
    @Get('company/history')
    @ApiOperation({ summary: 'Lista histórico de solicitações encerradas da empresa logada' })
    async getCompanyHistory(@Req() req: any): Promise<APIResponse> {
      const companyId = req.user.sub;
      const list = await this.collectionRequestService.getCompanyHistory(companyId);
    
      return new APIResponse()
        .setData(list)
        .setError(false)
        .setStatusCode(200)
        .setMessage('Histórico de solicitações da empresa')
        .build();
    }

  @UseGuards(JwtCompanyAuthGuard)
  @Post(':id/accept')
  @ApiOperation({ summary: 'Empresa aceita uma solicitação de coleta' })
  async accept(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<APIResponse> {
    const companyId = req.user.sub;
    const request = await this.collectionRequestService.acceptRequest(
      Number(id),
      companyId,
    );

    return new APIResponse()
      .setData(request)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Solicitação aceita e agendada')
      .build();
  }

  @UseGuards(JwtCompanyAuthGuard)
  @Post(':id/refuse')
  @ApiOperation({ summary: 'Empresa recusa uma solicitação de coleta' })
  async refuse(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<APIResponse> {
    const companyId = req.user.sub;
    const request = await this.collectionRequestService.refuseRequest(
      Number(id),
      companyId,
    );

    return new APIResponse()
      .setData(request)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Solicitação recusada')
      .build();
  }
}
