import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CollectionProductDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({
    description: 'Position inside the collection. Defaults to the array index if omitted.',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class SetCollectionProductsDto {
  @ApiProperty({
    type: [CollectionProductDto],
    description: 'Full replacement of the collection’s product list (in display order).',
  })
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique((item: CollectionProductDto) => item.productId)
  @ValidateNested({ each: true })
  @Type(() => CollectionProductDto)
  items!: CollectionProductDto[];
}
