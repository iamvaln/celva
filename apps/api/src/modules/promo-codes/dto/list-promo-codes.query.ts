import { Type } from 'class-transformer';
import {
  IsBooleanString,
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
import { PROMO_CODE_TYPE } from '@celva/shared';

const PROMO_SORT_FIELDS = ['code', 'createdAt', 'expiresAt'] as const;

export class ListPromoCodesQuery {
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

  @ApiPropertyOptional({ description: 'Substring search on the code.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  search?: string;

  @ApiPropertyOptional({ enum: Object.values(PROMO_CODE_TYPE) })
  @IsOptional()
  @IsEnum(PROMO_CODE_TYPE)
  type?: keyof typeof PROMO_CODE_TYPE;

  @ApiPropertyOptional({ description: '"true"/"false"' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({ enum: PROMO_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(PROMO_SORT_FIELDS as unknown as string[])
  sortBy?: (typeof PROMO_SORT_FIELDS)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';
}
