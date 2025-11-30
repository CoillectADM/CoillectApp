// src/auth/dto/login.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'E-mail do usuário',
    example: 'usuario@coillect.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'SenhaSegura123',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
