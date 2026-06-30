import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const DELIVERY_MODES = ['STAFF_DELIVERY', 'HOME_DELIVERY', 'STORE_PICKUP', 'RELAY_PICKUP'] as const;

/**
 * Acheminement (spec §5.4). Sets the delivery mode and, for the two
 * delivery modes, the courier + real cost (course fees for staff, courier
 * pay for external) and an optional course receipt. A real cost > 0 books a
 * Transaction EXPENSE/DELIVERY on the chosen payment account.
 */
export class AssignDeliveryDto {
  @ApiProperty({ enum: DELIVERY_MODES })
  @IsEnum(DELIVERY_MODES)
  mode!: (typeof DELIVERY_MODES)[number];

  @ApiPropertyOptional({ description: 'Team member or external courier (User id).' })
  @IsOptional()
  @IsUUID()
  delivererId?: string;

  @ApiPropertyOptional({
    description:
      'Real cost in XAF: course fees (taxi/fuel) for staff delivery, or what the external courier is paid. Books an EXPENSE/DELIVERY transaction when > 0.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0)
  actualCost?: number;

  @ApiPropertyOptional({ description: 'Course receipt URL/key (staff delivery).' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Account the course expense is paid from (PaymentAccount id).' })
  @IsOptional()
  @IsUUID()
  paymentAccountId?: string;

  @ApiPropertyOptional({ description: 'Operational note (courier phone, instructions…).' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackingNote?: string;
}
