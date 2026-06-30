import { join } from 'path';
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

/**
 * Celva brand palette — mirrors packages/tailwind-config/tokens.js so the
 * PDF reads as part of the same design system as the storefront and admin.
 */
const COLOR = {
  cream: '#FAF7F2',
  beigeDark: '#D4C4AE',
  olive: '#595D40',
  oliveLight: '#6E7354',
  terracotta: '#B26248',
  gray: '#8C8680',
} as const;

const FONTS_DIR = join(__dirname, '..', '..', 'assets', 'fonts');

Font.register({
  family: 'Bodoni Moda',
  fonts: [
    { src: join(FONTS_DIR, 'bodoni-moda-regular.ttf'), fontWeight: 'normal' },
    { src: join(FONTS_DIR, 'bodoni-moda-italic.ttf'), fontStyle: 'italic' },
  ],
});
Font.register({
  family: 'Cormorant Garamond',
  fonts: [
    { src: join(FONTS_DIR, 'cormorant-regular.ttf'), fontWeight: 'normal' },
    { src: join(FONTS_DIR, 'cormorant-italic.ttf'), fontStyle: 'italic' },
  ],
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLOR.cream,
    color: COLOR.olive,
    fontFamily: 'Cormorant Garamond',
    fontSize: 10.5,
    paddingHorizontal: 48,
    paddingVertical: 56,
    lineHeight: 1.5,
  },

  // ─── Header ─────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.beigeDark,
    borderBottomStyle: 'solid',
  },
  brand: { fontFamily: 'Bodoni Moda', fontSize: 28, letterSpacing: 4 },
  brandSub: {
    marginTop: 2,
    fontStyle: 'italic',
    fontSize: 9,
    color: COLOR.gray,
    letterSpacing: 1.4,
  },
  legal: { marginTop: 14, fontSize: 9, color: COLOR.gray, lineHeight: 1.5 },
  invoiceMeta: { alignItems: 'flex-end' },
  invoiceMetaLine: { flexDirection: 'row', justifyContent: 'flex-end' },
  invoiceTitle: {
    fontFamily: 'Bodoni Moda',
    fontSize: 22,
    color: COLOR.terracotta,
    letterSpacing: 2,
  },
  invoiceTitleEn: {
    fontFamily: 'Bodoni Moda',
    fontSize: 10,
    fontStyle: 'italic',
    color: COLOR.terracotta,
    marginTop: 2,
    letterSpacing: 1,
  },
  invoiceNumber: { marginTop: 12, fontSize: 12 },
  invoiceMetaItem: { marginTop: 8, fontSize: 10 },
  invoiceMetaItemEn: { fontStyle: 'italic', color: COLOR.gray, fontSize: 9 },

  // ─── Sections ───────────────────────────────────────────────────────
  section: { marginTop: 28 },
  eyebrow: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 9,
    color: COLOR.terracotta,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  eyebrowEn: {
    fontSize: 8,
    color: COLOR.gray,
    fontStyle: 'italic',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  bodyLine: { fontSize: 11 },
  bodyLineEn: { fontSize: 9, fontStyle: 'italic', color: COLOR.gray, marginBottom: 6 },

  // ─── Items table ────────────────────────────────────────────────────
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.beigeDark,
    borderBottomStyle: 'solid',
  },
  tableHeaderEnRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.beigeDark,
    borderBottomStyle: 'solid',
  },
  tableHeaderCell: {
    fontFamily: 'Cormorant Garamond',
    fontSize: 9,
    color: COLOR.terracotta,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  tableHeaderCellEn: {
    fontSize: 8,
    color: COLOR.gray,
    fontStyle: 'italic',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.beigeDark,
    borderBottomStyle: 'solid',
  },
  itemNameCell: { flex: 1 },
  itemQtyCell: { width: 50, textAlign: 'right' },
  itemPriceCell: { width: 90, textAlign: 'right' },
  itemTotalCell: { width: 90, textAlign: 'right' },
  itemNameFr: { fontSize: 11 },
  itemNameEn: { fontStyle: 'italic', fontSize: 9, color: COLOR.gray, marginTop: 1 },
  itemSku: { fontSize: 8, color: COLOR.gray, marginTop: 2, letterSpacing: 0.5 },

  // ─── Totals ─────────────────────────────────────────────────────────
  totalsWrap: { marginTop: 18, alignItems: 'flex-end' },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 230,
    paddingVertical: 3,
  },
  totalsLabel: { width: 140, fontSize: 10 },
  totalsLabelEn: { fontStyle: 'italic', fontSize: 9, color: COLOR.gray },
  totalsValue: { width: 90, textAlign: 'right', fontSize: 10 },
  totalDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLOR.beigeDark,
    borderBottomStyle: 'solid',
    width: 230,
    marginVertical: 4,
  },
  grandTotalLabel: {
    fontFamily: 'Bodoni Moda',
    width: 140,
    fontSize: 12,
    color: COLOR.terracotta,
    letterSpacing: 1.5,
  },
  grandTotalLabelEn: {
    fontFamily: 'Bodoni Moda',
    fontSize: 9,
    fontStyle: 'italic',
    color: COLOR.terracotta,
    letterSpacing: 1,
  },
  grandTotalValue: {
    fontFamily: 'Bodoni Moda',
    width: 90,
    textAlign: 'right',
    fontSize: 12,
    color: COLOR.terracotta,
  },

  // ─── Footer ─────────────────────────────────────────────────────────
  footer: {
    marginTop: 40,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: COLOR.beigeDark,
    borderTopStyle: 'solid',
  },
  footerLine: { fontSize: 9, color: COLOR.gray, textAlign: 'center', lineHeight: 1.6 },
  footerLineEn: {
    fontSize: 8,
    color: COLOR.gray,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
  },
});

// ── Public types ───────────────────────────────────────────────────────

export type InvoicePdfData = {
  invoiceNumber: string;
  issuedAt: Date;
  totals: { totalHT: string; totalTVA: string; totalTTC: string };
  taxRate: number; // 0.1925
  order: {
    orderNumber: string;
    subtotal: string;
    deliveryFee: string;
    discount: string;
    paymentMethod: 'CASH_ON_DELIVERY' | 'ORANGE_MONEY' | 'MTN_MOMO' | string;
    paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | string;
    paymentRef?: string | null;
    paidAt?: Date | null;
    promoCode?: string | null;
    items: ReadonlyArray<{
      productNameFr: string;
      productNameEn: string;
      sku: string;
      quantity: number;
      unitPriceHT: string;
      lineTotalHT: string;
    }>;
  };
  client: {
    name: string;
    email: string;
    phone?: string | null;
  };
  company: {
    name: string;
    address: string;
    taxId?: string;
    contactEmail?: string;
  };
};

// ── Formatters ─────────────────────────────────────────────────────────

const formatXAF = (value: string | number): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n))} XAF`;
};

const formatDate = (d: Date, locale: 'fr' | 'en'): string =>
  new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

const paymentLabel = (
  method: string,
  locale: 'fr' | 'en',
): string => {
  if (method === 'CASH_ON_DELIVERY') return locale === 'fr' ? 'À la livraison' : 'Cash on delivery';
  if (method === 'ORANGE_MONEY') return 'Orange Money';
  if (method === 'MTN_MOMO') return 'MTN MoMo';
  return method;
};

const paymentStatusLabel = (
  status: string,
  locale: 'fr' | 'en',
): string => {
  const map: Record<string, { fr: string; en: string }> = {
    PENDING: { fr: 'En attente', en: 'Pending' },
    COMPLETED: { fr: 'Réglée', en: 'Paid' },
    FAILED: { fr: 'Échouée', en: 'Failed' },
    REFUNDED: { fr: 'Remboursée', en: 'Refunded' },
  };
  return map[status]?.[locale] ?? status;
};

// ── Component ──────────────────────────────────────────────────────────

export const InvoicePdf = ({ data }: { data: InvoicePdfData }): JSX.Element => {
  const taxPct = (data.taxRate * 100).toFixed(2).replace(/\.0+$/, '');

  return (
    <Document
      title={`Celva · ${data.invoiceNumber}`}
      author="Celva Store"
      subject="Facture / Invoice"
    >
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>CELVA</Text>
            <Text style={styles.brandSub}>Cameroon · Haute couture</Text>
            <View style={styles.legal}>
              <Text>{data.company.name}</Text>
              <Text>{data.company.address}</Text>
              {data.company.taxId && data.company.taxId.length > 0 && (
                <Text>NIU · {data.company.taxId}</Text>
              )}
              {data.company.contactEmail && (
                <Text>{data.company.contactEmail}</Text>
              )}
            </View>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>FACTURE</Text>
            <Text style={styles.invoiceTitleEn}>Invoice</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <View style={styles.invoiceMetaItem}>
              <Text>Émise le {formatDate(data.issuedAt, 'fr')}</Text>
              <Text style={styles.invoiceMetaItemEn}>
                Issued on {formatDate(data.issuedAt, 'en')}
              </Text>
            </View>
            <View style={styles.invoiceMetaItem}>
              <Text>Commande {data.order.orderNumber}</Text>
              <Text style={styles.invoiceMetaItemEn}>Order {data.order.orderNumber}</Text>
            </View>
          </View>
        </View>

        {/* CLIENT */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>Facturé à</Text>
          <Text style={styles.eyebrowEn}>Billed to</Text>
          <Text style={styles.bodyLine}>{data.client.name}</Text>
          <Text style={styles.bodyLine}>{data.client.email}</Text>
          {data.client.phone && <Text style={styles.bodyLine}>{data.client.phone}</Text>}
        </View>

        {/* ITEMS */}
        <View style={styles.section}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.itemNameCell]}>Article</Text>
            <Text style={[styles.tableHeaderCell, styles.itemQtyCell]}>Qté</Text>
            <Text style={[styles.tableHeaderCell, styles.itemPriceCell]}>PU HT</Text>
            <Text style={[styles.tableHeaderCell, styles.itemTotalCell]}>Total HT</Text>
          </View>
          <View style={styles.tableHeaderEnRow}>
            <Text style={[styles.tableHeaderCellEn, styles.itemNameCell]}>Item</Text>
            <Text style={[styles.tableHeaderCellEn, styles.itemQtyCell]}>Qty</Text>
            <Text style={[styles.tableHeaderCellEn, styles.itemPriceCell]}>Unit ex. VAT</Text>
            <Text style={[styles.tableHeaderCellEn, styles.itemTotalCell]}>Total ex. VAT</Text>
          </View>

          {data.order.items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemNameCell}>
                <Text style={styles.itemNameFr}>{it.productNameFr}</Text>
                {it.productNameEn && it.productNameEn !== it.productNameFr && (
                  <Text style={styles.itemNameEn}>{it.productNameEn}</Text>
                )}
                <Text style={styles.itemSku}>SKU {it.sku}</Text>
              </View>
              <Text style={[styles.itemQtyCell, styles.bodyLine]}>{it.quantity}</Text>
              <Text style={[styles.itemPriceCell, styles.bodyLine]}>{formatXAF(it.unitPriceHT)}</Text>
              <Text style={[styles.itemTotalCell, styles.bodyLine]}>{formatXAF(it.lineTotalHT)}</Text>
            </View>
          ))}
        </View>

        {/* TOTALS */}
        <View style={styles.totalsWrap}>
          <View style={styles.totalsRow}>
            <View style={styles.totalsLabel}>
              <Text>Sous-total HT</Text>
              <Text style={styles.totalsLabelEn}>Subtotal ex. VAT</Text>
            </View>
            <Text style={styles.totalsValue}>{formatXAF(data.totals.totalHT)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <View style={styles.totalsLabel}>
              <Text>Livraison</Text>
              <Text style={styles.totalsLabelEn}>Delivery</Text>
            </View>
            <Text style={styles.totalsValue}>{formatXAF(data.order.deliveryFee)}</Text>
          </View>
          {Number(data.order.discount) > 0 && (
            <View style={styles.totalsRow}>
              <View style={styles.totalsLabel}>
                <Text>Remise {data.order.promoCode ? `(${data.order.promoCode})` : ''}</Text>
                <Text style={styles.totalsLabelEn}>Discount</Text>
              </View>
              <Text style={styles.totalsValue}>−{formatXAF(data.order.discount)}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <View style={styles.totalsLabel}>
              <Text>TVA {taxPct}%</Text>
              <Text style={styles.totalsLabelEn}>VAT {taxPct}%</Text>
            </View>
            <Text style={styles.totalsValue}>{formatXAF(data.totals.totalTVA)}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalsRow}>
            <View style={styles.totalsLabel}>
              <Text style={styles.grandTotalLabel}>TOTAL TTC</Text>
              <Text style={styles.grandTotalLabelEn}>Total incl. VAT</Text>
            </View>
            <Text style={styles.grandTotalValue}>{formatXAF(data.totals.totalTTC)}</Text>
          </View>
        </View>

        {/* PAYMENT */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>Paiement</Text>
          <Text style={styles.eyebrowEn}>Payment</Text>
          <Text style={styles.bodyLine}>
            {paymentLabel(data.order.paymentMethod, 'fr')} ·{' '}
            {paymentStatusLabel(data.order.paymentStatus, 'fr')}
            {data.order.paymentRef ? ` · réf. ${data.order.paymentRef}` : ''}
          </Text>
          <Text style={styles.bodyLineEn}>
            {paymentLabel(data.order.paymentMethod, 'en')} ·{' '}
            {paymentStatusLabel(data.order.paymentStatus, 'en')}
            {data.order.paymentRef ? ` · ref. ${data.order.paymentRef}` : ''}
          </Text>
          {data.order.paidAt && (
            <>
              <Text style={styles.bodyLine}>
                Réglée le {formatDate(data.order.paidAt, 'fr')}
              </Text>
              <Text style={styles.bodyLineEn}>
                Paid on {formatDate(data.order.paidAt, 'en')}
              </Text>
            </>
          )}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerLine}>
            Merci de votre confiance. TVA acquittée selon le régime camerounais en vigueur.
          </Text>
          <Text style={styles.footerLineEn}>
            Thank you for your trust. VAT collected per the Cameroonian regime in force.
          </Text>
          {data.company.contactEmail && (
            <>
              <Text style={[styles.footerLine, { marginTop: 6 }]}>
                Questions : {data.company.contactEmail}
              </Text>
              <Text style={styles.footerLineEn}>
                Questions: {data.company.contactEmail}
              </Text>
            </>
          )}
        </View>
      </Page>
    </Document>
  );
};
