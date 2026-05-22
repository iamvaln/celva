import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Inline edit of the two free fields admin can change post-checkout.
 * actualCost is the amount paid to the courier — never exposed to the
 * customer, used for margin reporting.
 */
export class UpdateDeliveryDto {
  @ApiPropertyOptional({ description: 'XAF amount paid to the courier (admin-internal).' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0)
  actualCost?: number;

  @ApiPropertyOptional({ description: 'Courier name, phone, status note — anything operational.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackingNote?: string;
}
