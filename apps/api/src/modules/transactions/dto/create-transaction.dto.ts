import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;

const TRANSACTION_CATEGORIES = [
  'SALE',
  'RAW_MATERIALS',
  'SUBCONTRACTING',
  'MARKETING',
  'TRANSPORT',
  'CUSTOMS',
  'SALARY',
  'RENT',
  'EQUIPMENT',
  'PACKAGING',
  'DELIVERY',
  'COMMISSION',
  'OTHER',
] as const;

export class CreateTransactionDto {
  @ApiProperty({ enum: TRANSACTION_TYPES })
  @IsEnum(TRANSACTION_TYPES)
  type!: (typeof TRANSACTION_TYPES)[number];

  @ApiProperty({ enum: TRANSACTION_CATEGORIES })
  @IsEnum(TRANSACTION_CATEGORIES)
  category!: (typeof TRANSACTION_CATEGORIES)[number];

  @ApiProperty({ description: 'XAF amount, positive. Type controls sign at reporting time.' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ description: 'Free-form description (purpose, supplier name…).' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'URL to a receipt / proof document (R2 upload deferred).' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptUrl?: string;

  @ApiPropertyOptional({
    description:
      'When the transaction happened (defaults to now). Useful for back-dating expenses.',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description:
      'Link to an order (e.g. an INCOME from a partial refund, or an EXPENSE tied to a specific order).',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;
}

export { TRANSACTION_TYPES, TRANSACTION_CATEGORIES };
