import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Matches, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BilingualTextDto } from '../../../common/dto/bilingual-text.dto';

/** #RGB or #RRGGBB. */
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

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

  @ApiPropertyOptional({
    description: 'Hex swatch for colour values, e.g. "#C4836B". Null/blank clears it.',
    example: '#C4836B',
  })
  // Blank from the admin form → null so the value can be cleared. IsOptional
  // then skips the hex check for null/undefined.
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @Matches(HEX_COLOR_PATTERN, { message: 'errors.invalid_color_hex' })
  colorHex?: string | null;
}
