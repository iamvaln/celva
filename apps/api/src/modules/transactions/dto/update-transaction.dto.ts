import { PartialType } from '@nestjs/swagger';
import { CreateTransactionDto } from './create-transaction.dto';

/**
 * Same shape, all fields optional. Service enforces "manual only" —
 * auto-generated rows (those with a non-null orderId created by
 * PaymentsService) refuse edits.
 */
export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
