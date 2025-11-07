import { IsNumberString } from 'class-validator';

export class CreateUserPhoneNumberDto {
  @IsNumberString()
  telefone: string;
}
