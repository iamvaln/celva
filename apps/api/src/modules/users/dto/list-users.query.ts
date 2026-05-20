import { IsBooleanString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { USER_ROLE } from '@celva/shared';

const USERS_SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'email', 'name', 'role'] as const;
export type UsersSortField = (typeof USERS_SORTABLE_FIELDS)[number];

export class ListUsersQuery {
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

  @ApiPropertyOptional({ enum: Object.values(USER_ROLE) })
  @IsOptional()
  @IsEnum(USER_ROLE)
  role?: keyof typeof USER_ROLE;

  @ApiPropertyOptional({ description: 'String "true"/"false"' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @ApiPropertyOptional({ description: 'Search across name + email' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: USERS_SORTABLE_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(USERS_SORTABLE_FIELDS as unknown as string[])
  sortBy?: UsersSortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';
}
