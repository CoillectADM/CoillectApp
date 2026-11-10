import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { APIResponse } from '../utils/response/response';
import { JwtUserAuthGuard } from '../auth/guards/jwt-user.guard';
import { JwtCompanyAuthGuard } from '../auth/guards/jwt-company.guard';
import { SensorService } from './sensor.service';
import { SensorReadingDto } from './dto/sensor-reading.dto';

@ApiTags('sensor')
@Controller('sensor')
export class SensorController {
  constructor(private readonly sensorService: SensorService) {}

  /**
   * Endpoint chamado pelo SENSOR (físico ou virtual). Sem login: o dispositivo
   * só precisa conhecer a URL da API e o próprio sensorId.
   */
  @Post('readings')
  @HttpCode(201)
  @ApiOperation({
    summary:
      'Sensor: envia a leitura do nível do barril. Ao atingir o limite, a API cria a solicitação de coleta',
  })
  @ApiResponse({ status: 201, description: 'Leitura registrada' })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 404, description: 'sensorId não cadastrado' })
  async receiveReading(@Body() dto: SensorReadingDto): Promise<APIResponse> {
    const result = await this.sensorService.registerReading(dto);
    const message = result.collection.triggered
      ? `Leitura registrada. Solicitação de coleta #${result.collection.request?.id} criada.`
      : 'Leitura registrada.';
    return new APIResponse()
      .setData(result)
      .setError(false)
      .setStatusCode(201)
      .setRequester(`sensor:${result.reading.sensorId}`)
      .setMessage(message)
      .build();
  }

  @UseGuards(JwtUserAuthGuard)
  @ApiBearerAuth()
  @Get('mine')
  @ApiOperation({ summary: 'Síndico: barril/sensor do seu condomínio' })
  async mine(@Req() req: any): Promise<APIResponse> {
    const sensor = await this.sensorService.findForSindico(req.user.sub);
    return new APIResponse()
      .setData(sensor)
      .setError(false)
      .setStatusCode(200)
      .setMessage(
        sensor ? 'Barril encontrado' : 'Nenhum barril vinculado a este síndico',
      )
      .build();
  }

  @UseGuards(JwtCompanyAuthGuard)
  @ApiBearerAuth()
  @Get('company')
  @ApiOperation({
    summary: 'Empresa: barris dos condomínios clientes (nível e última leitura)',
  })
  async company(@Req() req: any): Promise<APIResponse> {
    const list = await this.sensorService.findForCompany(req.user.sub);
    return new APIResponse()
      .setData(list)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Barris dos condomínios clientes')
      .build();
  }

  /** Estado atual de um sensor; útil para o sensor virtual e para testes. */
  @Get(':sensorId/status')
  @ApiOperation({ summary: 'Estado atual de um sensor (nível, limite, coleta aberta)' })
  @ApiParam({ name: 'sensorId', example: 'COI-DEMO-01' })
  async status(@Param('sensorId') sensorId: string): Promise<APIResponse> {
    const sensor = await this.sensorService.findViewByCode(sensorId);
    return new APIResponse()
      .setData(sensor)
      .setError(false)
      .setStatusCode(200)
      .setMessage('Estado do sensor')
      .build();
  }
}
