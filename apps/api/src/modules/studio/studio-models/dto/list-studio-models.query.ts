import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const SORTABLE = ['sortOrder', 'createdAt', 'updatedAt', 'basePrice'] as const;

export class ListStudioModelsQuery {
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

  @ApiPropertyOptional({ description: 'Search slug + name.{fr,en}.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'String "true"/"false" — admin only.' })
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  isActive?: string;

  @ApiPropertyOptional({ enum: SORTABLE, default: 'sortOrder' })
  @IsOptional()
  @IsIn(SORTABLE as unknown as string[])
  sortBy?: (typeof SORTABLE)[number] = 'sortOrder';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'asc';
}
