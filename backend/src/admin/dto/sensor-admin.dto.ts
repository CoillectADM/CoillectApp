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

const CODE_PATTERN = /^[A-Za-z0-9._-]+$/;
const CODE_MESSAGE =
  'deve conter apenas letras, números, ponto, hífen ou sublinhado';

export class CreateSensorDto {
  @ApiProperty({
    description: 'Identificador que o dispositivo enviará como sensorId',
    example: 'CLT-8472-A',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(CODE_PATTERN, { message: `sensorId ${CODE_MESSAGE}` })
  sensorId: string;

  @ApiPropertyOptional({
    description: 'ID do barril em que o sensor será instalado (GET /api/admin/barrels)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  barrelId?: number | null;

  @ApiPropertyOptional({
    description:
      '[atalho] ID do condomínio: sem barrelId, a API cria o barril "BRL-<sensorId>" nesse condomínio',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  condominiumId?: number | null;

  @ApiPropertyOptional({ description: 'Limite de disparo do barril (%)', example: 80 })
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
  @ApiPropertyOptional({
    description: 'ID do barril (null retira o sensor do barril)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  barrelId?: number | null;

  @ApiPropertyOptional({ description: 'Limite de disparo do barril (%)', example: 80 })
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

export class CreateBarrelDto {
  @ApiProperty({ description: 'Código do barril', example: 'BRL-8472' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(CODE_PATTERN, { message: `code ${CODE_MESSAGE}` })
  code: string;

  @ApiPropertyOptional({ description: 'ID do condomínio', example: 1 })
  @IsOptional()
  @IsInt()
  condominiumId?: number | null;

  @ApiPropertyOptional({ description: 'Capacidade (litros)', example: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacityLiters?: number | null;

  @ApiPropertyOptional({ description: 'Limite de alerta (%)', example: 80 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  alertThreshold?: number;
}

export class UpdateBarrelDto {
  @ApiPropertyOptional({ description: 'ID do condomínio (null desvincula)', example: 1 })
  @IsOptional()
  @IsInt()
  condominiumId?: number | null;

  @ApiPropertyOptional({ description: 'Capacidade (litros)', example: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacityLiters?: number | null;

  @ApiPropertyOptional({ description: 'Limite de alerta (%)', example: 80 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  alertThreshold?: number;
}
