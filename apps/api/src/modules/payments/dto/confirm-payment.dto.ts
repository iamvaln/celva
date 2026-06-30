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
import { ApiPropertyOptional } from '@nestjs/swagger';

const PAYMENT_METHODS = ['ORANGE_MONEY', 'MTN_MOMO', 'CASH_ON_DELIVERY'] as const;

export class ConfirmPaymentDto {
  @ApiPropertyOptional({
    description:
      'Provider reference (e.g. OM/MoMo transaction id, cash receipt number). Recorded on the Payment row.',
    example: 'OM-2026-05-21-1042',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  transactionRef?: string;

  @ApiPropertyOptional({
    enum: PAYMENT_METHODS,
    description:
      'Real payment method at encashment — may differ from the method planned at checkout (the client changes their mind on delivery). Overwrites Payment.method when provided.',
  })
  @IsOptional()
  @IsEnum(PAYMENT_METHODS)
  method?: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional({
    description: 'Encashment account the money actually landed in (PaymentAccount id).',
  })
  @IsOptional()
  @IsUUID()
  paymentAccountId?: string;

  @ApiPropertyOptional({
    description:
      'Amount actually collected, in XAF. Defaults to the amount due. A discrepancy vs the due amount is recorded on the booked transaction.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0)
  actualAmount?: number;
}
