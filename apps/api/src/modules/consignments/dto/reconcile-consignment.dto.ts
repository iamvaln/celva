import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReconcileConsignmentItemDto {
  @ApiProperty({ description: 'ConsignmentItem id (NOT variantId).' })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: 'Units actually sold off-site.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantitySold!: number;

  @ApiProperty({ description: 'Units returned to inventory.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantityReturned!: number;
}

export class ReconcileConsignmentDto {
  @ApiProperty({ type: [ReconcileConsignmentItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReconcileConsignmentItemDto)
  items!: ReconcileConsignmentItemDto[];

  @ApiPropertyOptional({
    description:
      'Sale price actually realised per unit (TTC) — defaults to variant.priceOverride or product.displayPrice. Optional override for a per-event special.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPriceOverride?: number;

  @ApiPropertyOptional({ description: 'Reconciliation notes.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
