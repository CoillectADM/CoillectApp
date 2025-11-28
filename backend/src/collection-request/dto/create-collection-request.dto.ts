import { IsInt, IsPositive } from 'class-validator';

export class CreateCollectionRequestDto {
  @IsInt()
  @IsPositive()
  companyId: number;
}
