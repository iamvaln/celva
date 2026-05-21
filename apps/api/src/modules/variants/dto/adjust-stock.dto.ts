import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, MinLength, NotEquals } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({
    description:
      'Signed quantity. Positive = stock in, negative = stock out. Must be non-zero.',
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @NotEquals(0, { message: 'errors.stock_delta_required' })
  quantity!: number;

  @ApiProperty({
    description: 'Audit reason. Required for MANUAL_ADJUSTMENT.',
    example: 'Recount after inventory',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(280)
  reason!: string;

  @ApiPropertyOptional({ description: 'Optional free-text comment recorded with the movement.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
