import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
}
