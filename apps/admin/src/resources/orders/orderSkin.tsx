import type { ReactNode } from 'react';
import { useTranslate } from 'react-admin';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import FacebookIcon from '@mui/icons-material/Facebook';
import TagIcon from '@mui/icons-material/Tag';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import StoreIcon from '@mui/icons-material/Store';
import type { OrderChannel, OrderStatus } from '@celva/shared';

/** Status → translation key + design status-class (color binding in celva-skin.css). */
export const ORDER_STATUS_SKIN: Record<OrderStatus, { key: string; sc: string }> = {
  PENDING: { key: 'ui.orders.status_pending', sc: 's-urgent' },
  CONFIRMED: { key: 'ui.orders.status_confirmed', sc: 's-neutral' },
  PROCESSING: { key: 'ui.orders.status_processing', sc: 's-todo' },
  READY: { key: 'ui.orders.status_ready', sc: 's-info' },
  SHIPPED: { key: 'ui.orders.status_shipped', sc: 's-info' },
  DELIVERED: { key: 'ui.orders.status_delivered', sc: 's-done' },
  COMPLETED: { key: 'ui.orders.status_completed', sc: 's-neutral' },
  CANCELLED: { key: 'ui.orders.status_cancelled', sc: 's-neutral' },
};

export const ORDER_CHANNEL_KEY: Record<OrderChannel, string> = {
  WEBSITE: 'ui.orders.channel_website',
  WHATSAPP: 'ui.orders.channel_whatsapp',
  FACEBOOK: 'ui.orders.channel_facebook',
  INSTAGRAM: 'ui.orders.channel_instagram',
  TIKTOK: 'ui.orders.channel_tiktok',
  IN_PERSON: 'ui.orders.channel_in_person',
};

const CHANNEL_ICON: Record<OrderChannel, typeof StorefrontIcon> = {
  WEBSITE: StorefrontIcon,
  WHATSAPP: WhatsAppIcon,
  FACEBOOK: FacebookIcon,
  INSTAGRAM: TagIcon,
  TIKTOK: MusicNoteIcon,
  IN_PERSON: StoreIcon,
};

export const ChannelIcon = ({ channel, size = 16 }: { channel: OrderChannel; size?: number }) => {
  const Icon = CHANNEL_ICON[channel] ?? StorefrontIcon;
  return <Icon sx={{ fontSize: size }} />;
};

export const fmtFCFA = (v: string | number): string =>
  new Intl.NumberFormat('fr-FR').format(Math.round(Number(v))) + ' FCFA';

/**
 * Compact relative time. With no `t` it falls back to French
 * ("il y a 12 min", "il y a 3 h", "hier", "il y a 4 j"); when the translate
 * fn is provided it renders via the `ui.time.*` keys.
 */
export const relativeFr = (iso: string, t?: (key: string, opts?: Record<string, unknown>) => string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return t ? t('ui.time.now') : "à l'instant";
  if (mins < 60) return t ? t('ui.time.min', { n: mins }) : `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return t ? t('ui.time.hour', { n: hours }) : `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return t ? t('ui.time.yesterday') : 'hier';
  return t ? t('ui.time.day', { n: days }) : `il y a ${days} j`;
};

export const StatusPill = ({ status, solid }: { status: OrderStatus; solid?: boolean }): ReactNode => {
  const t = useTranslate();
  const s = ORDER_STATUS_SKIN[status];
  return (
    <span className={`pill ${s.sc}${solid ? ' solid' : ''}`}>
      {!solid && <span className="pdot" />}
      {t(s.key)}
    </span>
  );
};
