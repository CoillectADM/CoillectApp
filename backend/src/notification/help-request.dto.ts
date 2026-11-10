import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { HELP_TOPICS, HelpTopic } from './notification.text';

/** "Precisa de ajuda?" do app do síndico. */
export class HelpRequestDto {
  @ApiProperty({
    description: 'Mensagem para a empresa coletora do condomínio',
    example: 'O barril está quase transbordando. Conseguem vir hoje?',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;

  @ApiPropertyOptional({ enum: HELP_TOPICS, example: 'COLETA' })
  @IsOptional()
  @IsIn(HELP_TOPICS as unknown as string[])
  topic?: HelpTopic;
}
