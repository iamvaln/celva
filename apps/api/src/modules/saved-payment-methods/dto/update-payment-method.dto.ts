import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePaymentMethodDto } from './create-payment-method.dto';

/**
 * Updating a saved payment method cannot change the method type — that's
 * effectively a different account. Delete + recreate to switch OM ↔ MoMo.
 */
export class UpdatePaymentMethodDto extends PartialType(
  OmitType(CreatePaymentMethodDto, ['method'] as const),
) {}
