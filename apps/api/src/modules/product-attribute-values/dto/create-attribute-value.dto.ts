import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BilingualTextDto } from '../../../common/dto/bilingual-text.dto';

export class CreateAttributeValueDto {
  @ApiProperty({
    type: BilingualTextDto,
    description: 'Value, e.g. {fr:"Bleu nuit",en:"Midnight blue"}',
  })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  value!: BilingualTextDto;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  attributeId!: string;

  @ApiPropertyOptional({
    description: 'Position. Unique per attribute. Auto-assigned if omitted.',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
