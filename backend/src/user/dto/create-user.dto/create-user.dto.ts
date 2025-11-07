import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsStrongPassword,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'Felipe Andrade Costa',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'E-mail do usuário utilizado para login e comunicações',
    example: 'felipe.andrade@coillect.com.br',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha segura (mínimo de 8 caracteres, incluindo letras maiúsculas, minúsculas, números e símbolos)',
    example: 'Coillect@2025',
  })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 1,
    minUppercase: 1,
  })
  password: string;

  @ApiProperty({
    description: 'Data de nascimento no formato DD/MM/YYYY',
    example: '12/05/1999',
  })
  @Matches(/^(\d{2})\/(\d{2})\/(\d{4})$/, {
    message: 'Data deve estar no formato DD/MM/YYYY',
  })
  data_nascimento: string;

  @ApiProperty({
    description: 'Indica se o e-mail foi verificado pelo usuário',
    example: true,
  })
  @IsBoolean()
  status_email: boolean;
}
