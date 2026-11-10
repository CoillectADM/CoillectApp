import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Contrato ÚNICO da leitura enviada pelo sensor físico (ESP32 via Wi-Fi/roteador)
 * e pelo sensor virtual. Ver docs/contrato-sensor.md.
 */
export class SensorReadingDto {
  @ApiProperty({
    description: 'Identificador do sensor cadastrado na API',
    example: 'COI-DEMO-01',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  sensorId: string;

  @ApiProperty({
    description: 'Nível do barril em percentual (0 a 100)',
    example: 85,
    minimum: 0,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  level: number;
}
