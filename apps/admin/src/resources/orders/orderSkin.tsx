import type { ReactNode } from 'react';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import FacebookIcon from '@mui/icons-material/Facebook';
import TagIcon from '@mui/icons-material/Tag';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import StoreIcon from '@mui/icons-material/Store';
import type { OrderChannel, OrderStatus } from '@celva/shared';

/** Status → French label + design status-class (color binding in celva-skin.css). */
export const ORDER_STATUS_SKIN: Record<OrderStatus, { label: string; sc: string }> = {
  PENDING: { label: 'En attente', sc: 's-urgent' },
  CONFIRMED: { label: 'Confirmée', sc: 's-neutral' },
  PROCESSING: { label: 'En préparation', sc: 's-todo' },
  READY: { label: 'Prête', sc: 's-info' },
  SHIPPED: { label: 'Expédiée', sc: 's-info' },
  DELIVERED: { label: 'Livrée', sc: 's-done' },
  COMPLETED: { label: 'Clôturée', sc: 's-neutral' },
  CANCELLED: { label: 'Annulée', sc: 's-neutral' },
};

export const ORDER_CHANNEL_LABEL: Record<OrderChannel, string> = {
  WEBSITE: 'Boutique en ligne',
  WHATSAPP: 'WhatsApp',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  IN_PERSON: 'En personne',
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

/** Compact French relative time: "il y a 12 min", "il y a 3 h", "hier", "il y a 4 j". */
export const relativeFr = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'hier';
  return `il y a ${days} j`;
};

export const StatusPill = ({ status, solid }: { status: OrderStatus; solid?: boolean }): ReactNode => {
  const s = ORDER_STATUS_SKIN[status];
  return (
    <span className={`pill ${s.sc}${solid ? ' solid' : ''}`}>
      {!solid && <span className="pdot" />}
      {s.label}
    </span>
  );
};
