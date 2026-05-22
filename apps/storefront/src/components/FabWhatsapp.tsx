import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { buildWhatsAppHref, getPublicSettings } from '@/lib/public-settings';
import { FabWhatsappClient } from './FabWhatsappClient';

/**
 * Server-side wrapper. Resolves the WhatsApp number from the public
 * Settings (admin-editable) and a localized prelude from translations,
 * then mounts the client component that owns the scroll-hide behavior.
 * Renders nothing if no number is configured — no placeholder fallback,
 * better to hide the affordance than send the customer to a dead +237 0
 * number.
 */
export const FabWhatsapp = async ({ locale }: { locale: Locale }) => {
  const settings = await getPublicSettings(locale);
  if (!settings.contactWhatsapp) return null;

  const t = await getTranslations({ locale, namespace: 'nav' });
  const prelude = t('whatsapp_prelude');
  const href = buildWhatsAppHref(settings.contactWhatsapp, prelude);

  return <FabWhatsappClient href={href} ariaLabel={t('whatsapp_open')} />;
};
