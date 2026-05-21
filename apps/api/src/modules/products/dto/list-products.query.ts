import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PRODUCTION_TYPE } from '@celva/shared';

const PRODUCTS_SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'displayPrice', 'slug'] as const;
export type ProductsSortField = (typeof PRODUCTS_SORTABLE_FIELDS)[number];

export class ListProductsQuery {
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

  @ApiPropertyOptional({ description: 'Search across slug + name.fr + name.en' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: Object.values(PRODUCTION_TYPE) })
  @IsOptional()
  @IsEnum(PRODUCTION_TYPE)
  productionType?: keyof typeof PRODUCTION_TYPE;

  @ApiPropertyOptional({ description: 'String "true"/"false"' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({ enum: PRODUCTS_SORTABLE_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(PRODUCTS_SORTABLE_FIELDS as unknown as string[])
  sortBy?: ProductsSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';
}
