import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DELIVERY_MODE, DELIVERY_STATUS } from '@celva/shared';

const DELIVERIES_SORTABLE = ['createdAt', 'updatedAt', 'assignedAt', 'deliveredAt'] as const;

export class ListDeliveriesQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 25;

  @ApiPropertyOptional({ description: 'Search across order.orderNumber + user.email + user.name.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: Object.values(DELIVERY_STATUS) })
  @IsOptional()
  @IsEnum(DELIVERY_STATUS)
  status?: keyof typeof DELIVERY_STATUS;

  @ApiPropertyOptional({ enum: Object.values(DELIVERY_MODE) })
  @IsOptional()
  @IsEnum(DELIVERY_MODE)
  mode?: keyof typeof DELIVERY_MODE;

  @ApiPropertyOptional({ description: 'ISO 8601 — deliveries created at/after this date.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 — deliveries created before this date.' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: DELIVERIES_SORTABLE, default: 'createdAt' })
  @IsOptional()
  @IsIn(DELIVERIES_SORTABLE as unknown as string[])
  sortBy?: (typeof DELIVERIES_SORTABLE)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';
}
