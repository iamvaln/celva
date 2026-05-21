import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COMMISSION_TYPE, PRODUCTION_TYPE } from '@celva/shared';
import { BilingualLongTextDto, BilingualTextDto } from '../../../common/dto/bilingual-text.dto';

const PRICE_DECIMAL_REGEX = /^\d+(?:\.\d{1,2})?$/;

export class CreateProductDto {
  @ApiProperty({ type: BilingualTextDto })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  name!: BilingualTextDto;

  @ApiPropertyOptional({ description: 'kebab-case; auto-generated from name.fr if omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'errors.invalid_slug' })
  slug?: string;

  @ApiPropertyOptional({ type: BilingualLongTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualLongTextDto)
  description?: BilingualLongTextDto;

  @ApiProperty({ description: 'TTC, in XAF, up to 2 decimals' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  displayPrice!: number;

  @ApiProperty({ description: 'TTC, in XAF, up to 2 decimals' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  floorPrice!: number;

  @ApiPropertyOptional({ description: 'HT, in XAF. Auto for INTERNAL/SUBCONTRACTED, manual for PURCHASED.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  costPrice?: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ enum: Object.values(PRODUCTION_TYPE) })
  @IsEnum(PRODUCTION_TYPE)
  productionType!: keyof typeof PRODUCTION_TYPE;

  @ApiPropertyOptional({ enum: Object.values(COMMISSION_TYPE), default: 'PERCENTAGE' })
  @IsOptional()
  @IsEnum(COMMISSION_TYPE)
  defaultCommissionType?: keyof typeof COMMISSION_TYPE;

  @ApiPropertyOptional({ description: 'Percent (0-100) for PERCENTAGE, XAF for FIXED' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Matches(PRICE_DECIMAL_REGEX, { message: 'errors.invalid_decimal' })
  defaultCommissionValue?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
