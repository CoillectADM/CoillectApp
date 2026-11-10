import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSindicoDto {
  @ApiProperty({ example: 'Leonardo Costa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'leonardo@exemplo.com' })
  @IsEmail()
  @MaxLength(120)
  email: string;

  @ApiPropertyOptional({
    description: 'Senha de acesso ao app do síndico. Se omitida, usa a senha de demonstração.',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(60)
  password?: string;
}

export class AdminCreateCompanyDto {
  @ApiProperty({ example: 'EcoColeta Ambiental' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'contato@ecocoleta.com' })
  @IsEmail()
  @MaxLength(120)
  email: string;

  @ApiProperty({ description: 'CNPJ, só números (14 dígitos)', example: '11222333000181' })
  @Matches(/^\d{14}$/, { message: 'cnpj deve ter 14 dígitos (somente números)' })
  cnpj: string;

  @ApiPropertyOptional({
    description: 'Senha de acesso ao app da empresa. Se omitida, usa a senha de demonstração.',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(60)
  password?: string;
}
