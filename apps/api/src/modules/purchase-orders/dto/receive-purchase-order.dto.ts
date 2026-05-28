import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReceivePurchaseOrderItemDto {
  @ApiProperty({ description: 'PurchaseOrderItem id.' })
  @IsUUID()
  id!: string;

  @ApiProperty({
    description:
      'New CUMULATIVE received quantity for this line (not a delta). Must be ≥ current received and ≤ ordered quantity.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0)
  quantityReceived!: number;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceivePurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items!: ReceivePurchaseOrderItemDto[];
}
