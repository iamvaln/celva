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

export const RELATED_PRODUCTS_MAX = 6;

export class RelatedProductItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  relatedProductId!: string;

  @ApiPropertyOptional({
    description: 'Display order in the "Complétez le look" section. Defaults to array index.',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class SetRelatedProductsDto {
  @ApiProperty({
    type: [RelatedProductItemDto],
    description: `Full replacement of the product’s cross-sell list. Max ${RELATED_PRODUCTS_MAX} per spec §4.7.`,
  })
  @IsArray()
  @ArrayMaxSize(RELATED_PRODUCTS_MAX, { message: 'errors.related_product_too_many' })
  @ArrayUnique((item: RelatedProductItemDto) => item.relatedProductId)
  @ValidateNested({ each: true })
  @Type(() => RelatedProductItemDto)
  items!: RelatedProductItemDto[];
}
