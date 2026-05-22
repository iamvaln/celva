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
import { ORDER_CHANNEL, ORDER_STATUS } from '@celva/shared';

const ORDERS_SORTABLE = ['createdAt', 'total', 'orderNumber'] as const;

export class ListOrdersQuery {
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

  @ApiPropertyOptional({ description: 'Search across orderNumber + client email + client name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: Object.values(ORDER_STATUS) })
  @IsOptional()
  @IsEnum(ORDER_STATUS)
  status?: keyof typeof ORDER_STATUS;

  @ApiPropertyOptional({ enum: Object.values(ORDER_CHANNEL) })
  @IsOptional()
  @IsEnum(ORDER_CHANNEL)
  channel?: keyof typeof ORDER_CHANNEL;

  @ApiPropertyOptional({ description: 'ISO 8601 — orders created at/after this date.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 — orders created before this date.' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ORDERS_SORTABLE, default: 'createdAt' })
  @IsOptional()
  @IsIn(ORDERS_SORTABLE as unknown as string[])
  sortBy?: (typeof ORDERS_SORTABLE)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';
}
