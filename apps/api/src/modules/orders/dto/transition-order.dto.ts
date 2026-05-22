import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ORDER_STATUS } from '@celva/shared';

/**
 * Allowed transitions (spec §7.5). PENDING is the starting state; CANCELLED
 * and COMPLETED are terminal. CANCELLED has its own dedicated endpoint
 * (POST :id/cancel) because it triggers stock + promo side-effects.
 */
const TRANSITIONABLE_STATUSES = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.READY,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETED,
] as const;

export class TransitionOrderDto {
  @ApiProperty({ enum: TRANSITIONABLE_STATUSES, description: 'Next status. Validated against the lifecycle.' })
  @IsEnum(TRANSITIONABLE_STATUSES, { message: 'errors.invalid_order_transition' })
  status!: (typeof TRANSITIONABLE_STATUSES)[number];

  @ApiPropertyOptional({ description: 'Internal note recorded in the audit log.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional({ description: 'Cancellation reason recorded in the audit log + StockMovement.' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;
}
