import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateVariantDto } from './create-variant.dto';

/**
 * Updating a variant never changes its product or its attribute combination
 * (those would make it a different SKU). Stock must go through the
 * StockMovementsService, never directly.
 */
export class UpdateVariantDto extends PartialType(
  OmitType(CreateVariantDto, ['productId', 'attributeValueIds', 'initialStock'] as const),
) {}
