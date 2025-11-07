import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyRepresentativeDto {
  @ApiProperty({
    description: 'Nome completo do representante legal da empresa',
    example: 'Marina Costa de Souza',
  })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'CPF do representante (somente números)',
    example: '39428195034',
  })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @IsString()
  cpf: string;

  @ApiProperty({
    description: 'Cargo do representante dentro da empresa',
    example: 'Gerente de Operações',
  })
  @IsNotEmpty({ message: 'Cargo é obrigatório' })
  @IsString()
  position: string;

  @ApiProperty({
    description: 'Telefone comercial do representante',
    example: '11987654321',
  })
  @IsNotEmpty({ message: 'Telefone comercial é obrigatório' })
  @IsString()
  commercialPhone: string;

  @ApiProperty({
    description: 'E-mail profissional do representante',
    example: 'marina.souza@oleoverde.com.br',
  })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  @IsEmail({}, { message: 'E-mail deve ser válido' })
  email: string;

  @ApiProperty({
    description: 'Endereço residencial do representante',
    example: 'Rua Joaquim Floriano, 100 - Itaim Bibi, São Paulo/SP',
  })
  @IsNotEmpty({ message: 'Endereço é obrigatório' })
  @IsString()
  address: string;
}
