import { useMemo, useState } from 'react';
import { Title, useGetList, useRedirect } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import type { OrderChannel, OrderStatus } from '@celva/shared';
import type { AdminOrderRow } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { ChannelIcon, ORDER_CHANNEL_LABEL, StatusPill, fmtFCFA, relativeFr } from './orderSkin';

type Tab = { id: string; label: string; match: (o: AdminOrderRow) => boolean };

const TABS: Tab[] = [
  { id: 'all', label: 'Toutes', match: () => true },
  { id: 'PENDING', label: 'En attente', match: (o) => o.status === 'PENDING' },
  { id: 'PREP', label: 'À préparer', match: (o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING' },
  { id: 'READY', label: 'Prêtes', match: (o) => o.status === 'READY' },
  { id: 'SHIPPED', label: 'Expédiées', match: (o) => o.status === 'SHIPPED' },
  { id: 'DELIVERED', label: 'Livrées', match: (o) => o.status === 'DELIVERED' || o.status === 'COMPLETED' },
  { id: 'CANCELLED', label: 'Annulées', match: (o) => o.status === 'CANCELLED' },
];

// status-class only (the celva-skin status color binding)
const STATUS_SC: Record<OrderStatus, string> = {
  PENDING: 's-urgent',
  CONFIRMED: 's-neutral',
  PROCESSING: 's-todo',
  READY: 's-info',
  SHIPPED: 's-info',
  DELIVERED: 's-done',
  COMPLETED: 's-neutral',
  CANCELLED: 's-neutral',
};

// Deep-link from the dashboard (?filter={"status":"PENDING"}) → preselect a tab.
const STATUS_TO_TAB: Partial<Record<OrderStatus, string>> = {
  PENDING: 'PENDING',
  CONFIRMED: 'PREP',
  PROCESSING: 'PREP',
  READY: 'READY',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

const initialTab = (): string => {
  try {
    const raw = new URLSearchParams(window.location.search).get('filter');
    if (raw) {
      const status = (JSON.parse(raw) as { status?: OrderStatus }).status;
      if (status && STATUS_TO_TAB[status]) return STATUS_TO_TAB[status] as string;
    }
  } catch {
    /* ignore malformed filter */
  }
  return 'all';
};

const CHANNELS: Array<['all' | OrderChannel, string]> = [
  ['all', 'Tous canaux'],
  ['WEBSITE', 'Boutique'],
  ['WHATSAPP', 'WhatsApp'],
  ['INSTAGRAM', 'Instagram'],
  ['FACEBOOK', 'Facebook'],
  ['IN_PERSON', 'En personne'],
];

const OrderRow = ({ o, onOpen }: { o: AdminOrderRow; onOpen: (id: string) => void }) => {
  const cod = o.payment?.method === 'CASH_ON_DELIVERY';
  const n = o.items.length;
  return (
    <div className={`order-row ${STATUS_SC[o.status]}`} onClick={() => onOpen(o.id)}>
      <div className="obar" />
      <div className="ochan" title={ORDER_CHANNEL_LABEL[o.channel]}>
        <ChannelIcon channel={o.channel} />
      </div>
      <div className="ometa">
        <div className="row" style={{ gap: 10 }}>
          <span className="onum">{o.orderNumber}</span>
          <span className="oclient">{o.user.name}</span>
          {cod && (
            <span className="tag-cash">
              <PaymentsIcon sx={{ fontSize: 13 }} /> cash à la livraison
            </span>
          )}
        </div>
        <div className="osub">
          <span>{ORDER_CHANNEL_LABEL[o.channel]}</span>
          <span>·</span>
          <span>{n + (n > 1 ? ' articles' : ' article')}</span>
        </div>
      </div>
      <div>
        <div className="oamt num">{fmtFCFA(o.total)}</div>
        <div className="otime">{relativeFr(o.createdAt)}</div>
      </div>
      <StatusPill status={o.status} />
    </div>
  );
};

export const OrderList = () => {
  const redirect = useRedirect();
  const [tab, setTab] = useState<string>(initialTab);
  const [q, setQ] = useState('');
  const [chan, setChan] = useState<'all' | OrderChannel>('all');
  const [sort, setSort] = useState<'recent' | 'amount'>('recent');
  const [perPage, setPerPage] = useState(50);

  const { data: orders = [], total = 0, isLoading } = useGetList<AdminOrderRow>('orders', {
    pagination: { page: 1, perPage },
    sort: { field: 'createdAt', order: 'DESC' },
  });

  const open = (id: string) => redirect('show', 'orders', id);

  const rows = useMemo(() => {
    const tabDef = TABS.find((tt) => tt.id === tab) ?? TABS[0]!;
    let r = orders.filter(tabDef.match);
    if (chan !== 'all') r = r.filter((o) => o.channel === chan);
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter(
        (o) => o.orderNumber.toLowerCase().includes(qq) || o.user.name.toLowerCase().includes(qq),
      );
    }
    if (sort === 'amount') r = r.slice().sort((a, b) => Number(b.total) - Number(a.total));
    return r;
  }, [orders, tab, chan, q, sort]);

  return (
    <CelvaSkin>
      <Title title="Commandes" />
      <div style={{ padding: '8px 4px 64px' }} className="fade-in">
        <div className="toolbar">
          <div className="search">
            <SearchIcon />
            <input
              placeholder="Rechercher n° ou cliente…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="tabs">
          {TABS.map((tt) => {
            const count = orders.filter(tt.match).length;
            return (
              <button
                key={tt.id}
                className={`tab${tt.id === tab ? ' active' : ''}`}
                onClick={() => setTab(tt.id)}
              >
                {tt.label}
                <span className="tcount num">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="subfilters">
          {CHANNELS.map(([id, label]) => (
            <button
              key={id}
              className={`chip${chan === id ? ' on' : ''}`}
              onClick={() => setChan(id)}
            >
              {label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span className="note" style={{ marginRight: 4 }}>
            Trier
          </span>
          <button className={`chip${sort === 'recent' ? ' on' : ''}`} onClick={() => setSort('recent')}>
            Récentes
          </button>
          <button className={`chip${sort === 'amount' ? ' on' : ''}`} onClick={() => setSort('amount')}>
            Montant
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="empty card">
            <div className="mono">
              <ReceiptLongIcon sx={{ fontSize: 56 }} />
            </div>
            <div style={{ fontSize: 17 }}>
              {isLoading ? 'Chargement…' : 'Aucune commande dans cette vue'}
            </div>
          </div>
        ) : (
          <div className="order-list">
            {rows.map((o) => (
              <OrderRow key={o.id} o={o} onOpen={open} />
            ))}
          </div>
        )}

        {orders.length < total && (
          <div className="load-more">
            <button className="btn btn-ghost" onClick={() => setPerPage((p) => p + 50)}>
              Charger plus
            </button>
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
