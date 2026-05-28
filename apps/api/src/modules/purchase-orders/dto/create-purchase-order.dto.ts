import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const COST_TYPES = ['TRANSPORT', 'CUSTOMS', 'BUYER_COMMISSION', 'INSURANCE', 'OTHER'] as const;

export class PurchaseOrderItemDto {
  @ApiProperty()
  @IsUUID()
  rawMaterialId!: string;

  @ApiProperty({ description: 'Quantity ordered.' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0.01)
  quantity!: number;

  @ApiProperty({ description: 'Unit price for this order (may differ from material default).' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0)
  unitPrice!: number;
}

export class PurchaseOrderCostDto {
  @ApiProperty({ enum: COST_TYPES })
  @IsEnum(COST_TYPES)
  type!: (typeof COST_TYPES)[number];

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];

  @ApiPropertyOptional({ type: [PurchaseOrderCostDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderCostDto)
  costs?: PurchaseOrderCostDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export { COST_TYPES };
