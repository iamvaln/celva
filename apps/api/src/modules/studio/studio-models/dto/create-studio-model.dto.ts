import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BilingualLongTextDto,
  BilingualTextDto,
} from '../../../../common/dto/bilingual-text.dto';

export class CreateStudioModelDto {
  @ApiPropertyOptional({
    description: 'URL-safe slug. Auto-generated from name.fr if omitted.',
    example: 'dafani',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, { message: 'errors.invalid_slug' })
  slug?: string;

  @ApiProperty({ type: BilingualTextDto })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  name!: BilingualTextDto;

  @ApiPropertyOptional({ type: BilingualLongTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualLongTextDto)
  shortDescription?: BilingualLongTextDto;

  @ApiPropertyOptional({ type: BilingualLongTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualLongTextDto)
  material?: BilingualLongTextDto;

  @ApiProperty({ example: 66000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice!: number;

  @ApiProperty({ type: BilingualTextDto, description: 'Délai de confection, ex. "4 à 6 semaines"' })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  delayLabel!: BilingualTextDto;

  @ApiPropertyOptional({ description: 'Image URL (returned by POST /uploads/image).' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
