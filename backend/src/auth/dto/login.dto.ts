import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'E-mail utilizado no login',
    example: 'felipe.andrade@coillect.com.br',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário cadastrada previamente',
    example: 'Coillect@2025',
  })
  @IsNotEmpty()
  password: string;
}
