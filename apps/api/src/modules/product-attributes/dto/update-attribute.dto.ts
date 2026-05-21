import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAttributeDto } from './create-attribute.dto';

/**
 * Updating an attribute keeps it tied to its original product.
 * Move it explicitly by creating a new one if needed.
 */
export class UpdateAttributeDto extends PartialType(
  OmitType(CreateAttributeDto, ['productId'] as const),
) {}
