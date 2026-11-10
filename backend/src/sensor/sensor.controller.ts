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
import { SensorAlertService } from './sensor-alert.service';
import { SensorAlertPayload } from './dto/sensor-alert.payload';
import { toAlertResponse } from './sensor-alert.controller';

@ApiTags('sensor')
@Controller('sensor')
export class SensorController {
  constructor(
    private readonly sensorService: SensorService,
    private readonly sensorAlertService: SensorAlertService,
  ) {}

  /**
   * Mesmo listener de POST /api/sensor-alert, mantido com o nome antigo.
   * Aceita { sensorId, percentual, dataHora } e também o formato antigo { sensorId, level }.
   */
  @Post('readings')
  @HttpCode(201)
  @ApiOperation({
    summary:
      'Sensor: mesmo que POST /api/sensor-alert (rota mantida por compatibilidade)',
  })
  @ApiResponse({ status: 201, description: 'Leitura registrada' })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 404, description: 'sensorId não cadastrado' })
  async receiveReading(
    @Body() payload: SensorAlertPayload,
  ): Promise<APIResponse> {
    return toAlertResponse(
      await this.sensorAlertService.processarAlerta(payload),
    );
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
  @ApiParam({ name: 'sensorId', example: 'CLT-8472-A' })
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
