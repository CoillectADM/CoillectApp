import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCondominiumDto {
  @ApiProperty({ example: 'Condomínio Demonstração' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Rua das Flores, 120 - São Paulo/SP' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário síndico (GET /api/admin/users). null desvincula.',
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
  @ApiPropertyOptional({ example: 'Condomínio Demonstração' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'Rua das Flores, 120 - São Paulo/SP' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  sindicoId?: number | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  companyId?: number | null;
}
