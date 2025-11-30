// src/auth/dto/company-login.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompanyLoginDto {
  @ApiProperty({
    description: 'E-mail corporativo da empresa coletora',
    example: 'contato@coletaeasy.com.br',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha de acesso da empresa',
    example: 'Empresa@2025',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
