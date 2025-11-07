import { IsNumberString, IsString, IsUppercase, Length } from 'class-validator';

export class CreateUserAddressDto {
  @IsString()
  rua: string;
  @IsString()
  cidade: string;
  @Length(2, 2)
  @IsUppercase()
  estado: string;

  @Length(8, 8)
  @IsNumberString()
  cep: string;
}
