import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PROMO_CODE_TYPE } from '@celva/shared';

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;

export class CreatePromoCodeDto {
  @ApiProperty({
    description: 'Uppercase code (A-Z/0-9/_/-, 2-32 chars). Unique across the store.',
    example: 'WELCOME10',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(CODE_PATTERN, { message: 'errors.invalid_promo_code_format' })
  code!: string;

  @ApiProperty({ enum: Object.values(PROMO_CODE_TYPE) })
  @IsEnum(PROMO_CODE_TYPE)
  type!: keyof typeof PROMO_CODE_TYPE;

  @ApiProperty({
    description: 'For PERCENTAGE: 1-100. For FIXED: positive XAF amount, max 1M.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  value!: number;

  @ApiPropertyOptional({ description: 'Subtotal threshold below which the code is rejected.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000)
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Total uses across all customers. Omit for unlimited.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Uses per individual customer. Omit for unlimited.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsesPerUser?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ISO 8601 datetime. Code rejected before this moment.' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 datetime. Code rejected at/after this moment.' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
