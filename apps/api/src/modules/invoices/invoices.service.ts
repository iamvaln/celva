import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SETTING_KEYS, TAX_RATE_CAMEROON } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { InvoicePdfData } from './invoice-pdf';
import { renderInvoicePdf } from './invoice-renderer';

/**
 * Renders the PDF for an Invoice row created by PaymentsService. Pulls
 * branding from Settings (company name, address, tax id, contact email)
 * so the storefront / admin can edit them without redeploying.
 */
@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async renderForUser(orderId: string, userId: string): Promise<{
    buffer: Buffer;
    invoiceNumber: string;
  }> {
    return this.renderInternal(orderId, { userId });
  }

  async renderForAdmin(orderId: string): Promise<{
    buffer: Buffer;
    invoiceNumber: string;
  }> {
    return this.renderInternal(orderId, {});
  }

  async renderByInvoiceNumber(invoiceNumber: string): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      select: { orderId: true },
    });
    if (!invoice) throw new NotFoundException('errors.not_found');
    const { buffer } = await this.renderInternal(invoice.orderId, {});
    return buffer;
  }

  private async renderInternal(
    orderId: string,
    opts: { userId?: string },
  ): Promise<{ buffer: Buffer; invoiceNumber: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: { include: { variant: { include: { product: true } } } },
        payment: true,
        promoCode: true,
        invoice: true,
      },
    });
    if (!order) throw new NotFoundException('errors.not_found');
    if (opts.userId && order.userId !== opts.userId) {
      throw new ForbiddenException('errors.forbidden');
    }
    const { invoice } = order;
    if (!invoice) {
      throw new NotFoundException('errors.invoice_not_ready');
    }

    const bilingual = (raw: unknown): { fr: string; en: string } => {
      const v = (raw ?? {}) as { fr?: string; en?: string };
      return { fr: v.fr ?? '', en: v.en ?? v.fr ?? '' };
    };

    const items: InvoicePdfData['order']['items'] = order.items.map((it) => {
      const taxRate = it.taxRate ?? new Prisma.Decimal(TAX_RATE_CAMEROON);
      const lineTtc = it.unitPrice.mul(it.quantity);
      const lineHt = lineTtc.div(new Prisma.Decimal(1).plus(taxRate));
      const unitHt = it.unitPrice.div(new Prisma.Decimal(1).plus(taxRate));
      const name = bilingual(it.variant.product.name);
      return {
        productNameFr: name.fr,
        productNameEn: name.en,
        sku: it.variant.sku,
        quantity: it.quantity,
        unitPriceHT: unitHt.toFixed(2),
        lineTotalHT: lineHt.toFixed(2),
      };
    });

    const company = await this.readCompanySettings();

    const data: InvoicePdfData = {
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.createdAt,
      totals: {
        totalHT: invoice.totalHT.toString(),
        totalTVA: invoice.totalTVA.toString(),
        totalTTC: invoice.totalTTC.toString(),
      },
      taxRate: TAX_RATE_CAMEROON,
      order: {
        orderNumber: order.orderNumber,
        subtotal: order.subtotal.toString(),
        deliveryFee: order.deliveryFee.toString(),
        discount: order.discount.toString(),
        paymentMethod: order.payment?.method ?? '—',
        paymentStatus: order.payment?.status ?? '—',
        paymentRef: order.payment?.transactionRef ?? null,
        paidAt: order.payment?.paidAt ?? null,
        promoCode: order.promoCode?.code ?? null,
        items,
      },
      client: {
        name: order.user.name,
        email: order.user.email,
        phone: order.user.phone ?? null,
      },
      company,
    };

    const buffer = await renderInvoicePdf(data);
    return { buffer, invoiceNumber: invoice.invoiceNumber };
  }

  private async readCompanySettings(): Promise<InvoicePdfData['company']> {
    const settings = await this.prisma.setting.findMany({
      where: {
        key: {
          in: [
            SETTING_KEYS.INVOICE_COMPANY_NAME,
            SETTING_KEYS.INVOICE_ADDRESS,
            SETTING_KEYS.INVOICE_TAX_ID,
            SETTING_KEYS.CONTACT_EMAIL,
          ],
        },
      },
      select: { key: true, value: true },
    });
    const map = new Map(settings.map((s) => [s.key, s.value]));
    return {
      name: map.get(SETTING_KEYS.INVOICE_COMPANY_NAME) ?? 'Celva Design SARL',
      address: map.get(SETTING_KEYS.INVOICE_ADDRESS) ?? 'Douala, Cameroun',
      taxId: map.get(SETTING_KEYS.INVOICE_TAX_ID) ?? undefined,
      contactEmail: map.get(SETTING_KEYS.CONTACT_EMAIL) ?? undefined,
    };
  }
}
