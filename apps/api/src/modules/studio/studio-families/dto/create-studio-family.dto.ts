import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
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

export class CreateStudioFamilyDto {
  @ApiPropertyOptional({
    description: 'URL-safe slug. Auto-generated from name.fr if omitted.',
    example: 'kente',
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
  description?: BilingualLongTextDto;

  @ApiPropertyOptional({ description: 'Optional banner image URL.' })
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
