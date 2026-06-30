import type { MailMessage } from '../mail/mail.service';

/**
 * Bilingual transactional emails for the Studio sur-mesure feature.
 * Mirrors the apps/api/src/modules/orders/order-emails.ts pattern: each
 * builder returns a plain MailMessage; dispatch is fire-and-forget from
 * the calling service.
 */

const buildBilingualBody = (sections: { fr: string; en: string }): string =>
  `${sections.fr}\n\n— · —\n\n${sections.en}`;

export type StudioRequestEmailContext = {
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  appointmentDate?: string | null;
  appointmentSlot?: string | null;
  appointmentMode?: 'ATELIER' | 'VISIO' | null;
  /** Pre-formatted "Family · Fabric" labels (in the customer's locale). */
  fabricLabels?: string[] | null;
  notes?: string | null;
};

const apptModeLabel = {
  fr: { ATELIER: "à l'atelier (rue Foch, Douala)", VISIO: 'en visio WhatsApp' },
  en: { ATELIER: 'at the studio (rue Foch, Douala)', VISIO: 'over WhatsApp video' },
} as const;

const formatFabricList = (labels: string[] | null | undefined): string => {
  const cleaned = (labels ?? []).filter((l): l is string => Boolean(l && l.trim()));
  if (cleaned.length === 0) return '—';
  return cleaned.map((l) => `  • ${l}`).join('\n');
};

/** Sent to the customer after they submit. */
export const buildStudioRequestCustomerEmail = (
  ctx: StudioRequestEmailContext,
): MailMessage | null => {
  if (!ctx.customerEmail) return null;

  const fabrics = formatFabricList(ctx.fabricLabels);

  const fr = [
    `Bonjour ${ctx.customerName},`,
    '',
    'Votre rendez-vous est enregistré.',
    ctx.appointmentDate ? `Date : ${ctx.appointmentDate}.` : '',
    ctx.appointmentSlot ? `Créneau : ${ctx.appointmentSlot}.` : '',
    ctx.appointmentMode ? `Format : ${apptModeLabel.fr[ctx.appointmentMode]}.` : '',
    fabrics !== '—' ? `Tissus retenus :\n${fabrics}` : '',
    '',
    'La styliste vous confirme par WhatsApp.',
    '',
    "L'équipe Celva",
  ]
    .filter(Boolean)
    .join('\n');

  const en = [
    `Hi ${ctx.customerName},`,
    '',
    'Your appointment is booked.',
    ctx.appointmentDate ? `Date: ${ctx.appointmentDate}.` : '',
    ctx.appointmentSlot ? `Slot: ${ctx.appointmentSlot}.` : '',
    ctx.appointmentMode ? `Format: ${apptModeLabel.en[ctx.appointmentMode]}.` : '',
    fabrics !== '—' ? `Selected fabrics:\n${fabrics}` : '',
    '',
    'The stylist will confirm by WhatsApp.',
    '',
    'The Celva team',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    to: ctx.customerEmail,
    subject:
      'Celva Studio · Rendez-vous enregistré / Appointment booked',
    tag: 'studio_request_received',
    text: buildBilingualBody({ fr, en }),
  };
};

/** Sent to the stylist / contact mailbox to action the request. */
export const buildStudioRequestInternalEmail = (
  ctx: StudioRequestEmailContext & { to: string; requestId: string },
): MailMessage => {
  const fabrics = formatFabricList(ctx.fabricLabels);

  const lines = [
    'Nouveau rendez-vous studio',
    `ID: ${ctx.requestId}`,
    `Client : ${ctx.customerName}`,
    `Téléphone : ${ctx.customerPhone}`,
    ctx.customerEmail ? `Email : ${ctx.customerEmail}` : '',
    ctx.appointmentDate ? `Date RDV : ${ctx.appointmentDate}` : '',
    ctx.appointmentSlot ? `Créneau : ${ctx.appointmentSlot}` : '',
    ctx.appointmentMode ? `Mode : ${ctx.appointmentMode}` : '',
    fabrics !== '—' ? `Tissus retenus :\n${fabrics}` : 'Aucun tissu présélectionné.',
    ctx.notes ? `Notes : ${ctx.notes}` : '',
  ].filter(Boolean);

  return {
    to: ctx.to,
    subject: `[Studio] Nouveau rendez-vous — ${ctx.customerName}`,
    tag: 'studio_request_internal',
    text: lines.join('\n'),
  };
};
