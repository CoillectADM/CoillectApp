import { IsNumberString } from 'class-validator';

export class UpdateUserPhoneNumberDto {
  @IsNumberString()
  telefone?: string;
}
