import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCondominiumDto {
  @ApiProperty({ example: 'Residencial Aurora' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Rua das Acácias, 120 - São Paulo/SP' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ description: 'Bairro', example: 'Jardim Paulista' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string;

  @ApiPropertyOptional({
    description: 'ID do síndico (GET /api/admin/sindicos). null desvincula.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  sindicoId?: number | null;

  @ApiPropertyOptional({
    description: 'ID da empresa coletora (GET /api/admin/companies). null desvincula.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  companyId?: number | null;
}

export class UpdateCondominiumDto {
  @ApiPropertyOptional({ example: 'Residencial Aurora' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'Rua das Acácias, 120 - São Paulo/SP' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ description: 'Bairro', example: 'Jardim Paulista' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  neighborhood?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  sindicoId?: number | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  companyId?: number | null;
}
