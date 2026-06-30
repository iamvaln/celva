import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const SORTABLE = ['sortOrder', 'createdAt', 'updatedAt'] as const;

export class ListStudioModelsQuery {
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

  @ApiPropertyOptional({ description: 'Filter by parent garment id.' })
  @IsOptional()
  @IsUUID()
  garmentId?: string;

  @ApiPropertyOptional({ description: 'String "true"/"false".' })
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
