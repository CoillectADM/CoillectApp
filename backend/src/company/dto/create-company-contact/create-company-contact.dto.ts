import { IsOptional, IsString } from 'class-validator';

export class CreateCompanyContactDto {
  @IsOptional()
  @IsString()
  receptionPhone?: string;

  @IsOptional()
  @IsString()
  adminPhone?: string;

  @IsOptional()
  @IsString()
  extension?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
