import {
  Length,
  IsUppercase,
  IsNumberString,
  IsOptional,
} from 'class-validator';

export class UpdateUserAddressDto {
  @IsOptional()
  rua?: string;
  @IsOptional()
  cidade?: string;
  @IsOptional()
  @Length(2, 2)
  @IsUppercase()
  estado?: string;

  @Length(8, 8)
  @IsOptional()
  @IsNumberString()
  cep?: string;
}
