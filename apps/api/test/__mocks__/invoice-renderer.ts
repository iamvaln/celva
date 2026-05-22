/**
 * Test-time stub for the @react-pdf-backed invoice renderer. Avoids
 * pulling the pure-ESM @react-pdf chain into Jest, while still letting
 * us assert on the produced buffer (it really starts with %PDF-).
 */
import type { InvoicePdfData } from '../../src/modules/invoices/invoice-pdf';

export const renderInvoicePdf = async (data: InvoicePdfData): Promise<Buffer> => {
  const header = '%PDF-1.4\n';
  const summary = JSON.stringify({
    invoiceNumber: data.invoiceNumber,
    orderNumber: data.order.orderNumber,
    total: data.totals.totalTTC,
    client: data.client.email,
    company: data.company.name,
  });
  // Pad to mimic a real PDF being non-trivial (assertion-friendly).
  return Buffer.from(header + summary + '\n%%EOF\n' + 'x'.repeat(2048));
};
