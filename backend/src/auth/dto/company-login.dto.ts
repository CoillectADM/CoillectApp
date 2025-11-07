// src/auth/dto/company-login.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CompanyLoginDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @IsNotEmpty({ message: 'Senha obrigatória' })
  password: string;
}
