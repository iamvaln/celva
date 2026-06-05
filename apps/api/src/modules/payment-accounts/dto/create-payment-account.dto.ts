import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PAYMENT_ACCOUNT_TYPES = ['CASH', 'ORANGE_MONEY', 'MTN_MOMO', 'BANK'] as const;

export class CreatePaymentAccountDto {
  @ApiProperty({ description: 'Display name, e.g. "Caisse", "OM Celva Business".' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: PAYMENT_ACCOUNT_TYPES })
  @IsEnum(PAYMENT_ACCOUNT_TYPES)
  type!: (typeof PAYMENT_ACCOUNT_TYPES)[number];

  @ApiPropertyOptional({ description: 'Phone / account number. Masked on display.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  identifier?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
