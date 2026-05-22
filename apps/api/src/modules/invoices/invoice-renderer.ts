import type { InvoicePdfData } from './invoice-pdf';

/**
 * Thin adapter around @react-pdf/renderer. Lives in its own file so that
 * Jest tests can mock the whole thing without having to stub each ESM
 * primitive (Document, View, Text, …). Nest is CJS at runtime and the
 * react-pdf chain is "type": "module", so we dynamic-import — Node 20+
 * resolves that cleanly. Cached after the first call.
 */
let cachedRenderer: ((data: InvoicePdfData) => Promise<Buffer>) | null = null;

export const renderInvoicePdf = async (data: InvoicePdfData): Promise<Buffer> => {
  if (!cachedRenderer) {
    const [renderer, template] = await Promise.all([
      import('@react-pdf/renderer'),
      import('./invoice-pdf'),
    ]);
    cachedRenderer = (d) => renderer.renderToBuffer(template.InvoicePdf({ data: d }));
  }
  return cachedRenderer(data);
};
