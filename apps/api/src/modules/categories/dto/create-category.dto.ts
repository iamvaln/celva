import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BilingualLongTextDto, BilingualTextDto } from '../../../common/dto/bilingual-text.dto';

export class CreateCategoryDto {
  @ApiProperty({ type: BilingualTextDto })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  name!: BilingualTextDto;

  @ApiPropertyOptional({ description: 'kebab-case; auto-generated from name.fr if omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'errors.invalid_slug' })
  slug?: string;

  @ApiPropertyOptional({ type: BilingualLongTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualLongTextDto)
  description?: BilingualLongTextDto;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
