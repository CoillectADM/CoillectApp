import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyContactDto {
  @ApiProperty({
    description: 'Telefone da recepção da empresa',
    example: '1132456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  receptionPhone?: string;

  @ApiProperty({
    description: 'Telefone da administração da empresa',
    example: '1132456790',
    required: false,
  })
  @IsOptional()
  @IsString()
  adminPhone?: string;

  @ApiProperty({
    description: 'Número do ramal interno, se aplicável',
    example: '203',
    required: false,
  })
  @IsOptional()
  @IsString()
  extension?: string;

  @ApiProperty({
    description: 'E-mail de contato adicional da empresa',
    example: 'admin@oleoverde.com.br',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;
}
