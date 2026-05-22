import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Invoice, type Payment } from '@prisma/client';
import {
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  SETTING_KEYS,
  TAX_RATE_CAMEROON,
  TRANSACTION_CATEGORY,
  TRANSACTION_TYPE,
  type PaymentStatus,
} from '@celva/shared';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { fireOrderEmail } from '../orders/order-emails';
import type { Env } from '../../config/env';

const INVOICE_NUMBER_PREFIX = 'CLV-INV';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async findById(id: string): Promise<Payment & { order: { id: string; status: string; userId: string } }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: { select: { id: true, status: true, userId: true } } },
    });
    if (!payment) throw new NotFoundException('errors.not_found');
    return payment as Payment & { order: { id: string; status: string; userId: string } };
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({ where: { orderId } });
  }

  async list(): Promise<Payment[]> {
    return this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /**
   * Atomic completion flow per spec §10 + §11:
   *   1. Payment → COMPLETED + paidAt + transactionRef
   *   2. Order PENDING → CONFIRMED (no-op if already CONFIRMED — Cash case)
   *   3. Transaction INCOME (category SALE) attributed to the actor
   *   4. Invoice row with monthly sequential number CLV-INV-YYYYMM-XXXX
   *      (PDF rendering + email come in Batch T)
   *
   * Idempotent on Payment.status: refuses to re-complete a COMPLETED
   * payment so the side-effects (transaction, invoice) only ever fire
   * once per order.
   */
  async markCompleted(
    paymentId: string,
    actorUserId: string,
    transactionRef?: string,
  ): Promise<{ payment: Payment; invoice: Invoice }> {
    const existing = await this.findById(paymentId);

    if (existing.status === PAYMENT_STATUS.COMPLETED) {
      throw new BadRequestException('errors.payment_already_completed');
    }

    const invoiceNumber = await this.nextInvoiceNumber();

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PAYMENT_STATUS.COMPLETED,
          paidAt: new Date(),
          transactionRef: transactionRef ?? undefined,
        },
      });

      // Order CONFIRMED for OM/MoMo (Cash was already CONFIRMED at checkout
      // per spec §10). updateMany prevents accidentally rewinding a manually
      // CANCELLED order back to CONFIRMED.
      const promotion = await tx.order.updateMany({
        where: { id: payment.orderId, status: ORDER_STATUS.PENDING },
        data: { status: ORDER_STATUS.CONFIRMED },
      });

      await tx.transaction.create({
        data: {
          type: TRANSACTION_TYPE.INCOME,
          category: TRANSACTION_CATEGORY.SALE,
          amount: payment.amount,
          description: `Payment ${payment.method} on order ${payment.orderId}`,
          orderId: payment.orderId,
          createdById: actorUserId,
        },
      });

      // Recompute HT / TVA / TTC from the order's items per spec §11 —
      // each OrderItem has its tax rate frozen at order time. We re-read
      // them in the same tx for consistency.
      const order = await tx.order.findUniqueOrThrow({
        where: { id: payment.orderId },
        include: { items: true },
      });

      const totals = computeInvoiceTotals(order.items, order.total);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          totalHT: totals.totalHT,
          totalTVA: totals.totalTVA,
          totalTTC: totals.totalTTC,
          orderId: payment.orderId,
        },
      });

      return { payment, invoice, promotedToConfirmed: promotion.count > 0 };
    });

    this.logger.log(
      `Payment ${paymentId} → COMPLETED, Invoice ${invoiceNumber} (TTC ${result.invoice.totalTTC.toFixed(2)})`,
    );

    // OM/MoMo path: PENDING → CONFIRMED happened just now, send the
    // confirmation email. Cash path: order was already CONFIRMED at checkout
    // and emailed there, so no duplicate.
    if (result.promotedToConfirmed) {
      fireOrderEmail(
        {
          prisma: this.prisma,
          mail: this.mail,
          storefrontUrl: this.config.get('STOREFRONT_URL', { infer: true }),
          logger: this.logger,
        },
        result.payment.orderId,
        'confirmation',
      );
    }

    return { payment: result.payment, invoice: result.invoice };
  }

  /**
   * Soft-fail: Payment status → FAILED. Order stays as-is (PENDING in
   * practice, since CONFIRMED orders won't reach here outside of a manual
   * admin override). Customer can retry via /me/orders/:id/retry-payment.
   */
  async markFailed(paymentId: string): Promise<Payment> {
    const existing = await this.findById(paymentId);
    if (existing.status === PAYMENT_STATUS.COMPLETED) {
      throw new BadRequestException('errors.payment_already_completed');
    }
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PAYMENT_STATUS.FAILED },
    });
    this.logger.log(`Payment ${paymentId} → FAILED`);
    return payment;
  }

  /**
   * Customer-side retry. In production this would call the OM/MoMo SDK and
   * wait for the callback to flip status to COMPLETED. In this batch we
   * stub-complete immediately so the storefront has a button that
   * demonstrates the full lifecycle end-to-end. Real provider integration
   * lands when API credentials are available.
   *
   * Refuses to retry if the order is already CONFIRMED (no payment due) or
   * if the payment is already COMPLETED.
   */
  async retryPayment(orderId: string, userId: string): Promise<{ payment: Payment; invoice: Invoice }> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('errors.not_found');
    if (order.userId !== userId) throw new ForbiddenException('errors.forbidden');

    const payment = await this.prisma.payment.findUnique({ where: { orderId } });
    if (!payment) throw new BadRequestException('errors.payment_not_found');
    if (payment.method === PAYMENT_METHOD.CASH_ON_DELIVERY) {
      // Cash settles offline — customer can't "retry" it
      throw new BadRequestException('errors.payment_cash_no_retry');
    }
    if (payment.status === PAYMENT_STATUS.COMPLETED) {
      throw new BadRequestException('errors.payment_already_completed');
    }

    // Reset to PENDING if it was FAILED, then complete via the same code path
    if (payment.status === PAYMENT_STATUS.FAILED) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PAYMENT_STATUS.PENDING },
      });
    }

    return this.markCompleted(payment.id, userId, `STUB-${Date.now()}`);
  }

  // ────────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────────

  /**
   * CLV-INV-YYYYMM-XXXX with monthly reset (spec §11 "remise mensuelle").
   * Same low-tech approach as the order counter — count this month's
   * invoices + 1. Production-grade sequence: Phase 6 follow-up.
   */
  private async nextInvoiceNumber(): Promise<string> {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const start = new Date(Date.UTC(yyyy, now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(yyyy, now.getUTCMonth() + 1, 1));
    const sameMonthCount = await this.prisma.invoice.count({
      where: { createdAt: { gte: start, lt: end } },
    });
    return `${INVOICE_NUMBER_PREFIX}-${yyyy}${mm}-${String(sameMonthCount + 1).padStart(4, '0')}`;
  }
}

/**
 * Computes HT / TVA / TTC from the OrderItems. Per spec §9, prices stored
 * on OrderItem are TTC and the taxRate is frozen — we derive HT from each
 * line's `unitPrice / (1 + taxRate)` and aggregate. totalTTC matches the
 * Order.total minus deliveryFee (we don't tax delivery here; that's the
 * Phase 6 finance refinement).
 */
function computeInvoiceTotals(
  items: Array<{ quantity: number; unitPrice: Prisma.Decimal; taxRate: Prisma.Decimal }>,
  orderTotal: Prisma.Decimal,
): { totalHT: Prisma.Decimal; totalTVA: Prisma.Decimal; totalTTC: Prisma.Decimal } {
  let ht = new Prisma.Decimal(0);
  let tva = new Prisma.Decimal(0);
  for (const it of items) {
    const lineTtc = it.unitPrice.mul(it.quantity);
    const lineHt = lineTtc.div(new Prisma.Decimal(1).plus(it.taxRate ?? TAX_RATE_CAMEROON));
    ht = ht.plus(lineHt);
    tva = tva.plus(lineTtc.minus(lineHt));
  }
  // totalTTC = orderTotal (already covers discount + delivery from R)
  return { totalHT: ht, totalTVA: tva, totalTTC: orderTotal };
}

// Re-export for the e2e suite which imports SETTING_KEYS via reference.
void SETTING_KEYS;
// Re-export the status type for downstream consumers (admin DTOs etc).
export type { PaymentStatus };
