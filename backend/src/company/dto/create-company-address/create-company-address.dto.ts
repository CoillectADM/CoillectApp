import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyAddressDto {
  @ApiProperty({
    description: 'CEP do endereço da empresa (somente números)',
    example: '04538011',
  })
  @IsNotEmpty()
  @IsString()
  cep: string;

  @ApiProperty({
    description: 'Nome da rua ou avenida',
    example: 'Rua Funchal',
  })
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiProperty({
    description: 'Número do imóvel',
    example: '777',
  })
  @IsNotEmpty()
  @IsString()
  number: string;

  @ApiProperty({
    description: 'Complemento do endereço, se houver',
    example: 'Bloco B - Sala 12',
  })
  @IsString()
  complement?: string;

  @ApiProperty({
    description: 'Bairro onde a empresa está localizada',
    example: 'Vila Olímpia',
  })
  @IsNotEmpty()
  @IsString()
  neighborhood: string;

  @ApiProperty({
    description: 'Cidade onde a empresa está localizada',
    example: 'São Paulo',
  })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({
    description: 'Estado (UF) da empresa',
    example: 'SP',
  })
  @IsNotEmpty()
  @IsString()
  state: string;
}
