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
  type: 'ORDER' | 'APPOINTMENT';
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  modelName?: string | null;
  fabricName?: string | null;
  sizeRef?: string | null;
  appointmentDate?: string | null;
  appointmentSlot?: string | null;
  appointmentMode?: 'ATELIER' | 'VISIO' | null;
  notes?: string | null;
};

const apptModeLabel = {
  fr: { ATELIER: 'à l\'atelier (rue Foch, Douala)', VISIO: 'en visio WhatsApp' },
  en: { ATELIER: 'at the studio (rue Foch, Douala)', VISIO: 'over WhatsApp video' },
} as const;

/** Sent to the customer after they submit. */
export const buildStudioRequestCustomerEmail = (
  ctx: StudioRequestEmailContext,
): MailMessage | null => {
  if (!ctx.customerEmail) return null;

  const piece = [ctx.modelName, ctx.fabricName].filter(Boolean).join(' · ') || '—';

  const fr =
    ctx.type === 'ORDER'
      ? [
          `Bonjour ${ctx.customerName},`,
          '',
          `Votre demande sur-mesure est bien reçue. Pièce envisagée : ${piece}.`,
          ctx.sizeRef ? `Taille de référence : ${ctx.sizeRef}.` : '',
          '',
          'La styliste vous rappelle sous 24 h pour confirmer, organiser la prise de mesures et lancer la confection.',
          '',
          'L\'équipe Celva',
        ]
          .filter(Boolean)
          .join('\n')
      : [
          `Bonjour ${ctx.customerName},`,
          '',
          'Votre rendez-vous est enregistré.',
          ctx.appointmentDate ? `Date : ${ctx.appointmentDate}.` : '',
          ctx.appointmentSlot ? `Créneau : ${ctx.appointmentSlot}.` : '',
          ctx.appointmentMode ? `Format : ${apptModeLabel.fr[ctx.appointmentMode]}.` : '',
          piece !== '—' ? `Pièce envisagée : ${piece}.` : '',
          '',
          'La styliste vous confirme par WhatsApp.',
          '',
          'L\'équipe Celva',
        ]
          .filter(Boolean)
          .join('\n');

  const en =
    ctx.type === 'ORDER'
      ? [
          `Hi ${ctx.customerName},`,
          '',
          `Your made-to-measure request was received. Considered piece: ${piece}.`,
          ctx.sizeRef ? `Reference size: ${ctx.sizeRef}.` : '',
          '',
          'The stylist will call you back within 24 h to confirm, schedule measurements and start the make.',
          '',
          'The Celva team',
        ]
          .filter(Boolean)
          .join('\n')
      : [
          `Hi ${ctx.customerName},`,
          '',
          'Your appointment is booked.',
          ctx.appointmentDate ? `Date: ${ctx.appointmentDate}.` : '',
          ctx.appointmentSlot ? `Slot: ${ctx.appointmentSlot}.` : '',
          ctx.appointmentMode ? `Format: ${apptModeLabel.en[ctx.appointmentMode]}.` : '',
          piece !== '—' ? `Considered piece: ${piece}.` : '',
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
      ctx.type === 'ORDER'
        ? 'Celva Studio · Demande sur-mesure reçue / Made-to-measure request received'
        : 'Celva Studio · Rendez-vous enregistré / Appointment booked',
    tag: 'studio_request_received',
    text: buildBilingualBody({ fr, en }),
  };
};

/** Sent to the stylist / contact mailbox to action the request. */
export const buildStudioRequestInternalEmail = (
  ctx: StudioRequestEmailContext & { to: string; requestId: string },
): MailMessage => {
  const heading = ctx.type === 'ORDER' ? 'Nouvelle demande sur-mesure' : 'Nouveau rendez-vous';
  const piece = [ctx.modelName, ctx.fabricName].filter(Boolean).join(' · ') || '—';

  const lines = [
    heading,
    `ID: ${ctx.requestId}`,
    `Client : ${ctx.customerName}`,
    `Téléphone : ${ctx.customerPhone}`,
    ctx.customerEmail ? `Email : ${ctx.customerEmail}` : '',
    `Pièce : ${piece}`,
    ctx.sizeRef ? `Taille : ${ctx.sizeRef}` : '',
    ctx.appointmentDate ? `Date RDV : ${ctx.appointmentDate}` : '',
    ctx.appointmentSlot ? `Créneau : ${ctx.appointmentSlot}` : '',
    ctx.appointmentMode ? `Mode : ${ctx.appointmentMode}` : '',
    ctx.notes ? `Notes : ${ctx.notes}` : '',
  ].filter(Boolean);

  return {
    to: ctx.to,
    subject: `[Studio] ${heading} — ${ctx.customerName}`,
    tag: 'studio_request_internal',
    text: lines.join('\n'),
  };
};
