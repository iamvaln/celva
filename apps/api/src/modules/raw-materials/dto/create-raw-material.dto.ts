import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const RAW_MATERIAL_TYPES = ['FABRIC', 'ACCESSORY', 'PACKAGING', 'OTHER'] as const;

export class CreateRawMaterialDto {
  @ApiProperty({ minLength: 1, maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ enum: RAW_MATERIAL_TYPES })
  @IsEnum(RAW_MATERIAL_TYPES)
  type!: (typeof RAW_MATERIAL_TYPES)[number];

  @ApiProperty({ description: 'Unit of measure (m, pièce, kg, rouleau…).' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unit!: string;

  @ApiProperty({ description: 'Cost per unit (XAF).' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ description: 'Opening stock quantity. Defaults to 0.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0)
  stockQty?: number;

  @ApiPropertyOptional({ description: 'Low-stock alert threshold (≤ triggers the flag).' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0)
  alertThreshold?: number;

  @ApiPropertyOptional({ description: 'Image key / URL (R2 upload deferred).' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageKey?: string;

  @ApiProperty()
  @IsUUID()
  supplierId!: string;
}

export { RAW_MATERIAL_TYPES };
