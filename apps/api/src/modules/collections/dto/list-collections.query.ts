import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const COLLECTIONS_SORTABLE_FIELDS = ['sortOrder', 'createdAt', 'slug'] as const;
export type CollectionsSortField = (typeof COLLECTIONS_SORTABLE_FIELDS)[number];

export class ListCollectionsQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 50;

  @ApiPropertyOptional({ description: 'Search across slug + name.fr + name.en' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: '"true"/"false"' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({ enum: COLLECTIONS_SORTABLE_FIELDS, default: 'sortOrder' })
  @IsOptional()
  @IsIn(COLLECTIONS_SORTABLE_FIELDS as unknown as string[])
  sortBy?: CollectionsSortField = 'sortOrder';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'asc';
}
