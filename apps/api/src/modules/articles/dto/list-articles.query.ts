import { Type } from 'class-transformer';
import {
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
import { ARTICLE_CATEGORIES, type ArticleCategoryLiteral } from './create-article.dto';

const ARTICLES_SORTABLE = ['publishedAt', 'createdAt', 'updatedAt'] as const;

export class ListArticlesQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Search across title.fr + title.en + slug.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: ARTICLE_CATEGORIES })
  @IsOptional()
  @IsEnum(ARTICLE_CATEGORIES)
  category?: ArticleCategoryLiteral;

  @ApiPropertyOptional({
    description:
      'String "true"/"false". Admin-only filter — the public list always restricts to published.',
  })
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  isPublished?: string;

  @ApiPropertyOptional({ enum: ARTICLES_SORTABLE, default: 'publishedAt' })
  @IsOptional()
  @IsIn(ARTICLES_SORTABLE as unknown as string[])
  sortBy?: (typeof ARTICLES_SORTABLE)[number] = 'publishedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';
}
