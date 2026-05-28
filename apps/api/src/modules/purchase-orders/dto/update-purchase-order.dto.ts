import { PartialType } from '@nestjs/swagger';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

/**
 * DRAFT-only. The service rejects edits once the PO is ORDERED+.
 * When items / costs are provided they REPLACE the existing arrays
 * wholesale (simpler + matches the "edit the draft" mental model).
 */
export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}
