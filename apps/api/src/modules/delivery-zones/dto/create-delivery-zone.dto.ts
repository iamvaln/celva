import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BilingualTextDto } from '../../../common/dto/bilingual-text.dto';

export class EstimatedDaysDto {
  @ApiProperty({ description: 'Best-case delivery in business days.', minimum: 0, maximum: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  min!: number;

  @ApiProperty({ description: 'Worst-case delivery in business days.', minimum: 0, maximum: 90 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(90)
  max!: number;
}

export class CreateDeliveryZoneDto {
  @ApiProperty({ type: BilingualTextDto })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  name!: BilingualTextDto;

  @ApiProperty({ description: 'Customer-facing fee in XAF.', minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  fee!: number;

  @ApiProperty({
    description:
      "Internal cost the courier actually charges. NEVER exposed to the storefront — used for margin reporting in Phase 6.",
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  actualCost!: number;

  @ApiPropertyOptional({
    description:
      'Subtotal at or above which delivery becomes free for this zone (when FREE_DELIVERY_ENABLED setting is true).',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000_000)
  freeDeliveryThreshold?: number;

  @ApiPropertyOptional({ type: EstimatedDaysDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EstimatedDaysDto)
  estimatedDays?: EstimatedDaysDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
