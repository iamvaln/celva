import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DELIVERY_STATUS } from '@celva/shared';

/**
 * Forward-only transitions; PENDING and DELIVERED are excluded from the
 * payload — PENDING is the seed (no need to set it), DELIVERED is the
 * happy terminal. ASSIGNED is also implicit (set on first action) but
 * we accept it so the admin can backfill if needed.
 */
const ALLOWED_NEXT = [
  DELIVERY_STATUS.ASSIGNED,
  DELIVERY_STATUS.PICKED_UP,
  DELIVERY_STATUS.IN_TRANSIT,
  DELIVERY_STATUS.DELIVERED,
  DELIVERY_STATUS.FAILED,
] as const;

export class TransitionDeliveryDto {
  @ApiProperty({ enum: ALLOWED_NEXT })
  @IsEnum(ALLOWED_NEXT, { message: 'errors.invalid_delivery_transition' })
  status!: (typeof ALLOWED_NEXT)[number];

  @ApiPropertyOptional({ description: 'Free-form note (e.g. courier name, FAILED reason).' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackingNote?: string;
}
