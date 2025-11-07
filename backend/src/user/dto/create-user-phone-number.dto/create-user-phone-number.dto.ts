import { IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserPhoneNumberDto {
  @ApiProperty({
    description: 'Telefone principal do usuário (somente números, com DDD)',
    example: '19987654321',
  })
  @IsNumberString()
  telefone: string;
}
