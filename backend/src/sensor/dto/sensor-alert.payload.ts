import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Contrato ÚNICO enviado pelo sensor físico (ESP32 via Wi-Fi/roteador) e pelo
 * sensor virtual. É o `AlertPayload` do diagrama do sensor e o
 * `SensorAlertPayload` do diagrama da API. Ver docs/contrato-sensor.md.
 *
 * Exemplo: { "sensorId": "CLT-8472-A", "percentual": 86, "dataHora": "2026-11-10T14:32:05-03:00" }
 */
export class SensorAlertPayload {
  @ApiProperty({
    description: 'Identificador do sensor cadastrado na API (SensorConfig.sensorId)',
    example: 'CLT-8472-A',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  sensorId: string;

  @ApiProperty({
    description:
      'Nível do barril em percentual (0 a 100), calculado pelo FillLevelCalculator do sensor',
    example: 86,
    minimum: 0,
    maximum: 100,
  })
  // Obrigatório, exceto quando o dispositivo antigo envia `level`.
  @ValidateIf((o) => o.level === undefined || o.percentual !== undefined)
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  percentual?: number;

  @ApiPropertyOptional({
    description:
      'Data/hora da medição no dispositivo. Opcional; é guardada como veio (ISO 8601 recomendado). A hora oficial é a de recebimento na API.',
    example: '2026-11-10T14:32:05-03:00',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value),
  )
  @IsString()
  @MaxLength(40)
  dataHora?: string;

  @ApiPropertyOptional({
    description: '[compatibilidade] Mesmo significado de `percentual`.',
    deprecated: true,
    example: 86,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  level?: number;
}

/** Leitura já normalizada que o restante da API usa. */
export interface SensorAlert {
  sensorId: string;
  /** Percentual inteiro entre 0 e 100. */
  percentual: number;
  /** dataHora do dispositivo, como veio (ou null). */
  dataHora: string | null;
}

export function normalizeSensorAlert(payload: SensorAlertPayload): SensorAlert {
  const value = Number(payload.percentual ?? payload.level);
  const dataHora =
    typeof payload.dataHora === 'string' && payload.dataHora.trim()
      ? payload.dataHora.trim()
      : null;
  return {
    sensorId: payload.sensorId.trim(),
    percentual: Math.round(Math.min(100, Math.max(0, value))),
    dataHora,
  };
}
