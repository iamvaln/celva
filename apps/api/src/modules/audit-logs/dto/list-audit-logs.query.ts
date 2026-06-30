import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListAuditLogsQuery {
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

  @ApiPropertyOptional({ description: 'Filter by action (e.g. CREATE, UPDATE, DELETE).' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by entity (e.g. Order, Product).' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  entity?: string;

  @ApiPropertyOptional({ description: 'Filter by acting user id.' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by app source (WEB_STORE, WEB_ADMIN, …).' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  appSource?: string;

  @ApiPropertyOptional({ description: 'Start of window (ISO date).' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End of window (ISO date).' })
  @IsOptional()
  @IsDateString()
  to?: string;

  // Accepted for compatibility with the admin dataProvider (which always
  // sends sortBy/sortDir for paginated resources). The list is intrinsically
  // ordered by createdAt desc — the service ignores these.
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['createdAt'])
  sortBy?: 'createdAt';

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
