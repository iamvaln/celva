import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const SKU_REGEX = /^[A-Z0-9][A-Z0-9._-]{1,49}$/;

export class CreateVariantDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    description: 'Uppercase SKU, A-Z/0-9/./_/-, 2-50 chars. Unique across the whole catalogue.',
    example: 'CLV-ROBE-NOIR-M',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(SKU_REGEX, { message: 'errors.invalid_sku' })
  sku!: string;

  @ApiProperty({
    type: [String],
    description:
      'Exactly one attribute-value UUID per attribute defined on the product. Validated server-side.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  attributeValueIds!: string[];

  @ApiPropertyOptional({ description: 'TTC, XAF. If set, overrides product.displayPrice.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  priceOverride?: number;

  @ApiPropertyOptional({
    description: 'Opening stock. Recorded via StockMovementsService (MANUAL_ADJUSTMENT).',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  initialStock?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
