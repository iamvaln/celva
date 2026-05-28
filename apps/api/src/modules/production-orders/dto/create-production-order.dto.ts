import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PRODUCTION_TYPES = ['INTERNAL', 'SUBCONTRACTED'] as const;

export class ConsumptionDto {
  @ApiProperty()
  @IsUUID()
  rawMaterialId!: string;

  @ApiProperty({ description: 'Quantity of this material consumed for the run.' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0.01)
  quantityUsed!: number;
}

export class StageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateProductionOrderDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ enum: PRODUCTION_TYPES })
  @IsEnum(PRODUCTION_TYPES)
  type!: (typeof PRODUCTION_TYPES)[number];

  @ApiProperty({ description: 'Units of finished product to be produced.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Internal labour cost (XAF). INTERNAL runs.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0)
  laborCost?: number;

  @ApiPropertyOptional({ description: 'Subcontractor fee (XAF). SUBCONTRACTED runs.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'errors.invalid_decimal' })
  @Min(0)
  subcontractCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  subcontractorName?: string;

  @ApiProperty({ type: [ConsumptionDto], description: 'Raw materials consumed.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ConsumptionDto)
  consumptions!: ConsumptionDto[];

  @ApiPropertyOptional({ type: [StageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => StageDto)
  stages?: StageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export { PRODUCTION_TYPES };
