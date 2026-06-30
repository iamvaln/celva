import type { Logger } from '@nestjs/common';
import { SETTING_KEYS } from '@celva/shared';
import type {
  DeliveryMode,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@celva/shared';
import type { PrismaService } from '../prisma/prisma.service';
import type { MailMessage, MailService } from '../mail/mail.service';
import type { InvoicesService } from '../invoices/invoices.service';

/**
 * Shape we need to build any order email. Pass exactly this — keeps the
 * helper independent of Prisma types so it can be unit-tested.
 */
export type OrderEmailContext = {
  orderNumber: string;
  status: OrderStatus;
  total: string | number;
  currency: 'XAF';
  user: { email: string; name: string; phone?: string | null };
  items: ReadonlyArray<{
    quantity: number;
    productNameFr: string;
    productNameEn: string;
  }>;
  delivery: {
    mode: DeliveryMode;
    pickupPointNameFr?: string | null;
    pickupPointNameEn?: string | null;
    pickupPointAddress?: string | null;
    pickupPointCity?: string | null;
    shippingAddress?: string | null;
    shippingCity?: string | null;
  } | null;
  payment: { method: PaymentMethod; status: PaymentStatus } | null;
  storefrontUrl: string;
};

/** Statuses we want the customer to know about. COMPLETED is admin-only. */
export const CUSTOMER_VISIBLE_TRANSITIONS: ReadonlyArray<OrderStatus> = [
  'PROCESSING',
  'READY',
  'SHIPPED',
  'DELIVERED',
] as OrderStatus[];

const formatXAF = (value: string | number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));

const orderLink = (storefrontUrl: string, orderNumber: string, locale: 'fr' | 'en'): string =>
  locale === 'fr'
    ? `${storefrontUrl}/fr/compte/commandes/${encodeURIComponent(orderNumber)}`
    : `${storefrontUrl}/en/account/orders/${encodeURIComponent(orderNumber)}`;

const itemsLines = (
  items: OrderEmailContext['items'],
  locale: 'fr' | 'en',
): string =>
  items
    .map(
      (it) =>
        `  • ${locale === 'fr' ? it.productNameFr : it.productNameEn} × ${it.quantity}`,
    )
    .join('\n');

const deliveryLines = (
  delivery: OrderEmailContext['delivery'],
  locale: 'fr' | 'en',
): string => {
  if (!delivery) return '';
  if (delivery.mode === 'HOME_DELIVERY') {
    const head = locale === 'fr' ? 'Livraison à domicile' : 'Home delivery';
    const addr = [delivery.shippingAddress, delivery.shippingCity]
      .filter(Boolean)
      .join(', ');
    return `${head}\n  ${addr}`;
  }
  const head = locale === 'fr' ? 'Retrait en boutique' : 'Store pickup';
  const name =
    (locale === 'fr' ? delivery.pickupPointNameFr : delivery.pickupPointNameEn) ?? '';
  const addr = [delivery.pickupPointAddress, delivery.pickupPointCity]
    .filter(Boolean)
    .join(', ');
  return `${head}\n  ${name}${addr ? ` — ${addr}` : ''}`;
};

const buildBilingualBody = (sections: { fr: string; en: string }): string =>
  `${sections.fr}\n\n— · —\n\n${sections.en}`;

// ──────────────────────────────────────────────────────────────────────────
// OrderConfirmation
// ──────────────────────────────────────────────────────────────────────────

export const buildOrderConfirmationEmail = (
  ctx: OrderEmailContext,
  invoicePdf?: { buffer: Buffer; invoiceNumber: string },
): MailMessage => {
  const totalLabel = formatXAF(ctx.total);
  const itemsFr = itemsLines(ctx.items, 'fr');
  const itemsEn = itemsLines(ctx.items, 'en');
  const deliveryFr = deliveryLines(ctx.delivery, 'fr');
  const deliveryEn = deliveryLines(ctx.delivery, 'en');
  const linkFr = orderLink(ctx.storefrontUrl, ctx.orderNumber, 'fr');
  const linkEn = orderLink(ctx.storefrontUrl, ctx.orderNumber, 'en');

  const fr = [
    `Bonjour ${ctx.user.name},`,
    '',
    `Votre commande ${ctx.orderNumber} est confirmée. Merci pour votre confiance.`,
    '',
    'Récapitulatif :',
    itemsFr,
    '',
    `Total : ${totalLabel}`,
    '',
    deliveryFr,
    '',
    `Suivre la commande : ${linkFr}`,
    '',
    "Nous vous tiendrons informée à chaque étape (préparation, expédition, livraison).",
    '',
    "L'équipe Celva",
  ].join('\n');

  const en = [
    `Hi ${ctx.user.name},`,
    '',
    `Your order ${ctx.orderNumber} is confirmed. Thank you for trusting us.`,
    '',
    'Summary:',
    itemsEn,
    '',
    `Total: ${totalLabel}`,
    '',
    deliveryEn,
    '',
    `Track your order: ${linkEn}`,
    '',
    "We'll keep you posted at every step (processing, shipping, delivery).",
    '',
    'The Celva team',
  ].join('\n');

  return {
    to: ctx.user.email,
    subject: `Celva · Commande ${ctx.orderNumber} confirmée / Order ${ctx.orderNumber} confirmed`,
    text: buildBilingualBody({ fr, en }),
    tag: 'order_confirmation',
    attachments: invoicePdf
      ? [
          {
            filename: `${invoicePdf.invoiceNumber}.pdf`,
            content: invoicePdf.buffer,
            contentType: 'application/pdf',
          },
        ]
      : undefined,
  };
};

// ──────────────────────────────────────────────────────────────────────────
// OrderStatusChanged — only fires for customer-visible transitions
// ──────────────────────────────────────────────────────────────────────────

const STATUS_LINES: Record<
  OrderStatus,
  { fr: { subject: string; body: string }; en: { subject: string; body: string } }
> = {
  PENDING: {
    fr: { subject: 'En attente', body: 'Votre commande est en attente de paiement.' },
    en: { subject: 'Pending', body: 'Your order is waiting for payment.' },
  },
  CONFIRMED: {
    fr: { subject: 'Confirmée', body: 'Votre commande est confirmée.' },
    en: { subject: 'Confirmed', body: 'Your order is confirmed.' },
  },
  PROCESSING: {
    fr: {
      subject: 'En préparation',
      body: 'Bonne nouvelle : nous avons commencé à préparer votre commande.',
    },
    en: {
      subject: 'Being prepared',
      body: "Good news: we've started preparing your order.",
    },
  },
  READY: {
    fr: {
      subject: 'Prête',
      body: 'Votre commande est prête. Vous serez contactée au sujet du retrait ou de la livraison.',
    },
    en: {
      subject: 'Ready',
      body: "Your order is ready. We'll be in touch about pickup or delivery.",
    },
  },
  SHIPPED: {
    fr: {
      subject: 'Expédiée',
      body: 'Votre commande est en route. Le ou la coursière prendra contact à la livraison.',
    },
    en: {
      subject: 'Shipped',
      body: "Your order is on its way. The courier will reach out at delivery.",
    },
  },
  DELIVERED: {
    fr: { subject: 'Livrée', body: 'Votre commande a été livrée. Merci !' },
    en: { subject: 'Delivered', body: 'Your order has been delivered. Thank you!' },
  },
  COMPLETED: {
    fr: { subject: 'Terminée', body: 'Votre commande est terminée.' },
    en: { subject: 'Completed', body: 'Your order is complete.' },
  },
  CANCELLED: {
    fr: { subject: 'Annulée', body: 'Votre commande a été annulée.' },
    en: { subject: 'Cancelled', body: 'Your order has been cancelled.' },
  },
};

export const buildOrderStatusEmail = (ctx: OrderEmailContext): MailMessage => {
  const linesFr = STATUS_LINES[ctx.status].fr;
  const linesEn = STATUS_LINES[ctx.status].en;
  const linkFr = orderLink(ctx.storefrontUrl, ctx.orderNumber, 'fr');
  const linkEn = orderLink(ctx.storefrontUrl, ctx.orderNumber, 'en');

  // READY for STORE_PICKUP gets a pickup-point reminder appended.
  const isReadyPickup =
    ctx.status === 'READY' && ctx.delivery?.mode === 'STORE_PICKUP';
  const pickupReminderFr = isReadyPickup
    ? `\n\nVotre point de retrait :\n${deliveryLines(ctx.delivery, 'fr')}`
    : '';
  const pickupReminderEn = isReadyPickup
    ? `\n\nYour pickup point:\n${deliveryLines(ctx.delivery, 'en')}`
    : '';

  const fr = [
    `Bonjour ${ctx.user.name},`,
    '',
    `Commande ${ctx.orderNumber} — ${linesFr.subject}.`,
    '',
    linesFr.body + pickupReminderFr,
    '',
    `Détails : ${linkFr}`,
    '',
    "L'équipe Celva",
  ].join('\n');

  const en = [
    `Hi ${ctx.user.name},`,
    '',
    `Order ${ctx.orderNumber} — ${linesEn.subject}.`,
    '',
    linesEn.body + pickupReminderEn,
    '',
    `Details: ${linkEn}`,
    '',
    'The Celva team',
  ].join('\n');

  return {
    to: ctx.user.email,
    subject: `Celva · Commande ${ctx.orderNumber} ${linesFr.subject.toLowerCase()} / Order ${ctx.orderNumber} ${linesEn.subject.toLowerCase()}`,
    text: buildBilingualBody({ fr, en }),
    tag: `order_status_${ctx.status.toLowerCase()}`,
  };
};

// ──────────────────────────────────────────────────────────────────────────
// OrderCancelled
// ──────────────────────────────────────────────────────────────────────────

export const buildOrderCancelledEmail = (
  ctx: OrderEmailContext,
  reason: string | undefined,
): MailMessage => {
  const linkFr = orderLink(ctx.storefrontUrl, ctx.orderNumber, 'fr');
  const linkEn = orderLink(ctx.storefrontUrl, ctx.orderNumber, 'en');
  const trimmed = reason?.trim();
  const reasonFr = trimmed ? `\n\nMotif communiqué : ${trimmed}` : '';
  const reasonEn = trimmed ? `\n\nReason on file: ${trimmed}` : '';

  const fr = [
    `Bonjour ${ctx.user.name},`,
    '',
    `Votre commande ${ctx.orderNumber} a été annulée. Le stock a été restauré et, le cas échéant, votre code promo est à nouveau utilisable.${reasonFr}`,
    '',
    `Détails : ${linkFr}`,
    '',
    'Si cette annulation vous surprend, écrivez-nous — nous sommes là.',
    '',
    "L'équipe Celva",
  ].join('\n');

  const en = [
    `Hi ${ctx.user.name},`,
    '',
    `Your order ${ctx.orderNumber} has been cancelled. Stock has been restored and, if any, your promo code is usable again.${reasonEn}`,
    '',
    `Details: ${linkEn}`,
    '',
    "If this cancellation comes as a surprise, reach out — we're here.",
    '',
    'The Celva team',
  ].join('\n');

  return {
    to: ctx.user.email,
    subject: `Celva · Commande ${ctx.orderNumber} annulée / Order ${ctx.orderNumber} cancelled`,
    text: buildBilingualBody({ fr, en }),
    tag: 'order_cancelled',
  };
};

// ──────────────────────────────────────────────────────────────────────────
// NewOrderAdmin — internal alert to the ops inbox on every new order
// ──────────────────────────────────────────────────────────────────────────

const paymentLine = (
  payment: OrderEmailContext['payment'],
): string => (payment ? `${payment.method} (${payment.status})` : '—');

export const buildNewOrderAdminEmail = (
  ctx: OrderEmailContext,
  recipient: string,
): MailMessage => {
  const totalLabel = formatXAF(ctx.total);
  const contact = [ctx.user.name, ctx.user.email, ctx.user.phone]
    .filter(Boolean)
    .join(' · ');

  const text = [
    `Nouvelle commande ${ctx.orderNumber} — ${totalLabel}`,
    `Statut : ${ctx.status}`,
    '',
    `Cliente : ${contact}`,
    '',
    'Articles :',
    itemsLines(ctx.items, 'fr'),
    '',
    `Total : ${totalLabel}`,
    `Paiement : ${paymentLine(ctx.payment)}`,
    '',
    deliveryLines(ctx.delivery, 'fr') || 'Livraison : —',
    '',
    `Ouvrir dans le back-office et traiter la commande ${ctx.orderNumber}.`,
  ].join('\n');

  return {
    to: recipient,
    subject: `Celva · Nouvelle commande ${ctx.orderNumber} — ${totalLabel}`,
    text,
    tag: 'admin_new_order',
  };
};

// ──────────────────────────────────────────────────────────────────────────
// Dispatch — shared between OrdersService and PaymentsService so that any
// place an order status flips can fire the right email without duplicating
// the Prisma hydration logic. Kept out of a service to dodge a circular
// PaymentsModule ↔ OrdersModule dependency.
// ──────────────────────────────────────────────────────────────────────────

export type OrderEmailKind =
  | 'confirmation'
  | 'status'
  | 'cancelled'
  | 'admin_new_order';

export type OrderEmailDispatchDeps = {
  prisma: PrismaService;
  mail: MailService;
  storefrontUrl: string;
  logger: Logger;
  /**
   * Optional. When provided, OrderConfirmation emails ship the invoice
   * PDF as an attachment (only fires when a matching Invoice row exists).
   * Status / cancellation emails ignore this.
   */
  invoices?: InvoicesService;
};

/**
 * Fire-and-forget. Failures are logged but never bubble — mirrors the
 * welcome/password-reset resilience pattern in AuthService.
 */
export const fireOrderEmail = (
  deps: OrderEmailDispatchDeps,
  orderId: string,
  kind: OrderEmailKind,
  reason?: string,
): void => {
  void dispatchOrderEmail(deps, orderId, kind, reason).catch((err: unknown) => {
    deps.logger.warn(
      `Order email (${kind}) for order ${orderId} failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  });
};

export const dispatchOrderEmail = async (
  deps: OrderEmailDispatchDeps,
  orderId: string,
  kind: OrderEmailKind,
  reason: string | undefined,
): Promise<void> => {
  const order = await deps.prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true, name: true, phone: true } },
      items: { include: { variant: { include: { product: true } } } },
      payment: { select: { method: true, status: true } },
      delivery: { include: { pickupPoint: true } },
    },
  });
  if (!order || !order.user) return;

  const bilingual = (raw: unknown): { fr: string; en: string } => {
    const v = (raw ?? {}) as { fr?: string; en?: string };
    return { fr: v.fr ?? '', en: v.en ?? v.fr ?? '' };
  };

  const ctx: OrderEmailContext = {
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    total: order.total.toString(),
    currency: 'XAF',
    user: { email: order.user.email, name: order.user.name, phone: order.user.phone },
    items: order.items.map((it) => {
      const name = bilingual(it.variant.product.name);
      return { quantity: it.quantity, productNameFr: name.fr, productNameEn: name.en };
    }),
    delivery: order.delivery
      ? {
          mode: order.delivery.mode as DeliveryMode,
          pickupPointNameFr: order.delivery.pickupPoint
            ? bilingual(order.delivery.pickupPoint.name).fr
            : null,
          pickupPointNameEn: order.delivery.pickupPoint
            ? bilingual(order.delivery.pickupPoint.name).en
            : null,
          pickupPointAddress: order.delivery.pickupPoint?.address ?? null,
          pickupPointCity: order.delivery.pickupPoint?.city ?? null,
          shippingAddress: order.shippingAddress,
          shippingCity: order.shippingCity,
        }
      : null,
    payment: order.payment
      ? {
          method: order.payment.method as PaymentMethod,
          status: order.payment.status as PaymentStatus,
        }
      : null,
    storefrontUrl: deps.storefrontUrl,
  };

  // Internal ops alert — resolve the recipient from settings
  // (ORDER_NOTIFICATION_EMAIL → CONTACT_EMAIL → hard default) and send.
  if (kind === 'admin_new_order') {
    const [notif, contact] = await Promise.all([
      deps.prisma.setting.findUnique({
        where: { key: SETTING_KEYS.ORDER_NOTIFICATION_EMAIL },
      }),
      deps.prisma.setting.findUnique({
        where: { key: SETTING_KEYS.CONTACT_EMAIL },
      }),
    ]);
    const recipient = notif?.value || contact?.value || 'contact@celva.store';
    await deps.mail.send(buildNewOrderAdminEmail(ctx, recipient));
    return;
  }

  let invoiceAttachment: { buffer: Buffer; invoiceNumber: string } | undefined;
  if (kind === 'confirmation' && deps.invoices) {
    try {
      invoiceAttachment = await deps.invoices.renderForAdmin(orderId);
    } catch (err) {
      // No Invoice row yet (PENDING payment) — ship the confirmation
      // without the PDF, the customer will be able to download it from
      // /me/orders/:id/invoice as soon as the payment completes.
      deps.logger.debug(
        `Invoice attachment skipped for ${orderId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const message =
    kind === 'confirmation'
      ? buildOrderConfirmationEmail(ctx, invoiceAttachment)
      : kind === 'cancelled'
        ? buildOrderCancelledEmail(ctx, reason)
        : buildOrderStatusEmail(ctx);

  await deps.mail.send(message);
};
