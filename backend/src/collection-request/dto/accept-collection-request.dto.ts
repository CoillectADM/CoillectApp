import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class AcceptCollectionRequestDto {
  @ApiPropertyOptional({
    description:
      'Data/hora prevista para a coleta (ISO 8601). Se omitida, a coleta é iniciada agora.',
    example: '2026-11-12T14:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}
