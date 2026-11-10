import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * "Agendar coleta" do app da empresa: informe o barril pelo sensorId (como aparece
 * no app, ex.: "CLT-8472-A") ou pelo barrelId.
 */
export class ScheduleCollectionDto {
  @ApiPropertyOptional({
    description: 'Sensor do barril selecionado (obrigatório se barrelId não for enviado)',
    example: 'CLT-8472-A',
  })
  @ValidateIf((o) => o.barrelId === undefined || o.sensorId !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  sensorId?: string;

  @ApiPropertyOptional({ description: 'ID do barril', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  barrelId?: number;

  @ApiPropertyOptional({
    description: 'Data/hora prevista (ISO 8601). Se omitida, a coleta fica agendada para agora.',
    example: '2026-11-12T14:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}
