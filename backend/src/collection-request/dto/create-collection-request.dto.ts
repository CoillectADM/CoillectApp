import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCollectionRequestDto {
  @ApiProperty({
    description: 'ID da empresa coletora escolhida pelo usuário',
    example: 13,
  })
  @IsNotEmpty()
  @IsInt()
  companyId: number;
}
