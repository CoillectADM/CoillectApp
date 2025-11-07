import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateCompanyRepresentativeDto {
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @IsString()
  cpf: string;

  @IsNotEmpty({ message: 'Cargo é obrigatório' })
  @IsString()
  position: string;

  @IsNotEmpty({ message: 'Telefone comercial é obrigatório' })
  @IsString()
  commercialPhone: string;

  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  @IsEmail({}, { message: 'E-mail deve ser válido' })
  email: string;

  @IsNotEmpty({ message: 'Endereço é obrigatório' })
  @IsString()
  address: string;
}
