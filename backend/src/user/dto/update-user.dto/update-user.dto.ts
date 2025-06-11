import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsStrongPassword,
  Matches,
} from 'class-validator';

export class UpdateUserDto {
  @IsNotEmpty()
  @IsOptional()
  name: string;

  @IsEmail()
  @IsOptional()
  email: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 1,
    minUppercase: 1,
  })
  @IsOptional()
  password: string;

  @Matches(/^(\d{2})\/(\d{2})\/(\d{4})$/, {
    message: 'Data deve estar no formato DD/MM/YYYY',
  })
  @IsOptional()
  data_nascimento: string;

  @IsBoolean()
  @IsOptional()
  status_email: boolean;
}
