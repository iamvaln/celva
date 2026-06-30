import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const SUBSCRIBERS_SORTABLE = ['subscribedAt', 'unsubscribedAt', 'email'] as const;

export class ListSubscribersQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Search across email + name.' })
  @IsOptional()
  @IsString()
  @MaxLength(254)
  search?: string;

  @ApiPropertyOptional({ description: 'String "true"/"false" — filter by active state.' })
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  isActive?: string;

  @ApiPropertyOptional({ enum: SUBSCRIBERS_SORTABLE, default: 'subscribedAt' })
  @IsOptional()
  @IsIn(SUBSCRIBERS_SORTABLE as unknown as string[])
  sortBy?: (typeof SUBSCRIBERS_SORTABLE)[number] = 'subscribedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';
}
