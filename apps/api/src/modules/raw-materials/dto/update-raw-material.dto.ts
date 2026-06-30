import { PartialType } from '@nestjs/swagger';
import { CreateRawMaterialDto } from './create-raw-material.dto';

/**
 * stockQty is intentionally still editable here for opening-balance
 * corrections. Once purchase-order reception lands (item 36), stock
 * should move through that flow rather than manual edits — but the
 * manual override stays available for adjustments.
 */
export class UpdateRawMaterialDto extends PartialType(CreateRawMaterialDto) {}
