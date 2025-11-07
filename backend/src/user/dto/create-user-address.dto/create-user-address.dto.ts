import { IsNumberString, IsString, IsUppercase, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserAddressDto {
  @ApiProperty({
    description: 'Rua onde o usuário reside',
    example: 'Rua das Palmeiras',
  })
  @IsString()
  rua: string;

  @ApiProperty({
    description: 'Cidade do endereço do usuário',
    example: 'Campinas',
  })
  @IsString()
  cidade: string;

  @ApiProperty({
    description: 'Sigla do estado (UF)',
    example: 'SP',
  })
  @Length(2, 2)
  @IsUppercase()
  estado: string;

  @ApiProperty({
    description: 'CEP do endereço (somente números)',
    example: '13015200',
  })
  @Length(8, 8)
  @IsNumberString()
  cep: string;
}
