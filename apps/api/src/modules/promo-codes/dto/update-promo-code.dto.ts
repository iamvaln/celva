import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePromoCodeDto } from './create-promo-code.dto';

/**
 * Updating a code never changes the code string itself — codes are public
 * (customers type them), so changing one would invalidate every usage
 * already in flight. Delete + recreate to rotate.
 */
export class UpdatePromoCodeDto extends PartialType(
  OmitType(CreatePromoCodeDto, ['code'] as const),
) {}
