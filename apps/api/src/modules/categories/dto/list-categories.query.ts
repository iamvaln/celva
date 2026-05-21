import { Type } from 'class-transformer';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const CATEGORIES_SORTABLE_FIELDS = ['sortOrder', 'createdAt', 'slug'] as const;
export type CategoriesSortField = (typeof CATEGORIES_SORTABLE_FIELDS)[number];

export class ListCategoriesQuery {
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

  @ApiPropertyOptional({
    description: 'Storefront filter: only categories with at least one active product.',
  })
  @IsOptional()
  @IsBooleanString()
  hasActiveProducts?: string;

  @ApiPropertyOptional({ enum: CATEGORIES_SORTABLE_FIELDS, default: 'sortOrder' })
  @IsOptional()
  @IsIn(CATEGORIES_SORTABLE_FIELDS as unknown as string[])
  sortBy?: CategoriesSortField = 'sortOrder';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'asc';
}
