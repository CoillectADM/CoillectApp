import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Nome completo da empresa coletora',
    example: 'Óleo Verde Coleta Sustentável LTDA',
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 100)
  name: string;

  @ApiProperty({
    description: 'E-mail corporativo principal da empresa',
    example: 'contato@oleoverde.com.br',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Senha de acesso ao sistema Coillect',
    example: 'Oleo@2025',
  })
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'CNPJ da empresa coletora (somente números)',
    example: '45879632000175',
  })
  @IsNotEmpty()
  @IsString()
  cnpj: string;

}
