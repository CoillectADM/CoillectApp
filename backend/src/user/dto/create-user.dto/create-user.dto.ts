import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsStrongPassword,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 1,
    minUppercase: 1,
  })
  password: string;

  @Matches(/^(\d{2})\/(\d{2})\/(\d{4})$/, {
    message: 'Data deve estar no formato DD/MM/YYYY',
  })
  data_nascimento: string;

  @IsBoolean()
  status_email: boolean;
}
