import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { APIResponse } from '../utils/response/response';
import { SensorAlertPayload } from './dto/sensor-alert.payload';
import { SensorAlertResult, SensorAlertService } from './sensor-alert.service';

/** Resposta enviada ao sensor (o ESP32 só precisa do HTTP 201). */
export function toAlertResponse(result: SensorAlertResult): APIResponse {
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

/**
 * `SensorAlertController` do diagrama da API: o listener HTTP do sensor.
 * Recebe o POST do sensor físico (ESP32 via roteador) ou do sensor virtual.
 * Sem login: o dispositivo só precisa conhecer a URL da API e o próprio sensorId.
 */
@ApiTags('sensor')
@Controller('sensor-alert')
export class SensorAlertController {
  constructor(private readonly sensorAlertService: SensorAlertService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary:
      'Sensor: envia a leitura { sensorId, percentual, dataHora }. Ao atingir o limite do barril, a API cria a solicitação de coleta',
  })
  @ApiResponse({ status: 201, description: 'Leitura registrada' })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 404, description: 'sensorId não cadastrado' })
  async receberAlerta(
    @Body() payload: SensorAlertPayload,
  ): Promise<APIResponse> {
    return toAlertResponse(
      await this.sensorAlertService.processarAlerta(payload),
    );
  }
}
