import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSensorDto {
  @ApiProperty({
    description: 'Identificador que o dispositivo enviará como sensorId',
    example: 'COI-ESP32-01',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message: 'sensorId deve conter apenas letras, números, ponto, hífen ou sublinhado',
  })
  sensorId: string;

  @ApiPropertyOptional({ description: 'ID do condomínio', example: 1 })
  @IsOptional()
  @IsInt()
  condominiumId?: number | null;

  @ApiPropertyOptional({ description: 'Limite de disparo (%)', example: 80 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  threshold?: number;

  @ApiPropertyOptional({ description: 'Capacidade do barril (litros)', example: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacityLiters?: number | null;
}

export class UpdateSensorDto {
  @ApiPropertyOptional({ description: 'ID do condomínio (null desvincula)', example: 1 })
  @IsOptional()
  @IsInt()
  condominiumId?: number | null;

  @ApiPropertyOptional({ description: 'Limite de disparo (%)', example: 80 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  threshold?: number;

  @ApiPropertyOptional({ description: 'Capacidade do barril (litros)', example: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacityLiters?: number | null;
}
