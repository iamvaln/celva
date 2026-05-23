import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReleaseConsignmentItemDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ description: 'Units handed off to the sales rep.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ReleaseConsignmentDto {
  @ApiProperty()
  @IsUUID()
  salesRepId!: string;

  @ApiProperty({ type: [ReleaseConsignmentItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ReleaseConsignmentItemDto)
  items!: ReleaseConsignmentItemDto[];

  @ApiPropertyOptional({ description: 'Optional context: event name, location, etc.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
