import './purchase-orders.css';
import { useMemo, useState } from 'react';
import { Title, useGetList, useRedirect, useTranslate } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { PurchaseOrder } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA } from '../orders/orderSkin';

type POStatus = PurchaseOrder['status'];

/** Status → translation key + design status-class (color binding in celva-skin.css). */
const PO_STATUS_SKIN: Record<POStatus, { key: string; sc: string }> = {
  DRAFT: { key: 'status_draft', sc: 's-neutral' },
  ORDERED: { key: 'status_ordered', sc: 's-info' },
  PARTIALLY_RECEIVED: { key: 'status_partially_received', sc: 's-todo' },
  RECEIVED: { key: 'status_received', sc: 's-done' },
  CANCELLED: { key: 'status_cancelled', sc: 's-neutral' },
};

type Tab = { id: string; key: string; match: (p: PurchaseOrder) => boolean };

const TABS: Tab[] = [
  { id: 'all', key: 'tab_all', match: () => true },
  { id: 'DRAFT', key: 'tab_draft', match: (p) => p.status === 'DRAFT' },
  { id: 'ORDERED', key: 'tab_ordered', match: (p) => p.status === 'ORDERED' },
  {
    id: 'PARTIALLY_RECEIVED',
    key: 'tab_partially_received',
    match: (p) => p.status === 'PARTIALLY_RECEIVED',
  },
  { id: 'RECEIVED', key: 'tab_received', match: (p) => p.status === 'RECEIVED' },
  { id: 'CANCELLED', key: 'tab_cancelled', match: (p) => p.status === 'CANCELLED' },
];

const POStatusPill = ({ status }: { status: POStatus }) => {
  const t = useTranslate();
  const s = PO_STATUS_SKIN[status];
  return (
    <span className={`pill ${s.sc}`}>
      <span className="pdot" />
      {t('ui.purchase-orders.' + s.key)}
    </span>
  );
};

const dateFr = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );

const supplierName = (p: PurchaseOrder): string => p.supplier?.name ?? '—';

const PORow = ({ p, onOpen }: { p: PurchaseOrder; onOpen: (id: string) => void }) => {
  const t = useTranslate();
  const sc = PO_STATUS_SKIN[p.status].sc;
  const n = p.items?.length ?? 0;
  return (
    <div className={`lrow po ${sc}`} onClick={() => onOpen(p.id)}>
      <div className="obar" />
      <div className="po-ic">
        <Inventory2Icon sx={{ fontSize: 17 }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="po-head">
          <span className="lname">{supplierName(p)}</span>
        </div>
        <div className="lsub">
          <span>{n + (n > 1 ? ' ' + t('ui.purchase-orders.lines') : ' ' + t('ui.purchase-orders.line'))}</span>
          <span>·</span>
          <span>{dateFr(p.createdAt)}</span>
        </div>
      </div>
      <div />
      <div className="lcell">
        <div className="lc-v num">{fmtFCFA(p.totalAmount)}</div>
        <div className="lc-l">{t('ui.purchase-orders.total_cost_label')}</div>
      </div>
      <div className="lchev">
        <POStatusPill status={p.status} />
        <ChevronRightIcon sx={{ fontSize: 18, ml: 1 }} />
      </div>
    </div>
  );
};

export const PurchaseOrderList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const [tab, setTab] = useState<string>('all');
  const [q, setQ] = useState('');

  const { data: orders = [], isLoading } = useGetList<PurchaseOrder>('purchase-orders', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'createdAt', order: 'DESC' },
  });

  const open = (id: string) => redirect('show', 'purchase-orders', id);

  const rows = useMemo(() => {
    const tabDef = TABS.find((tt) => tt.id === tab) ?? TABS[0]!;
    let r = orders.filter(tabDef.match);
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter((p) => supplierName(p).toLowerCase().includes(qq));
    }
    return r;
  }, [orders, tab, q]);

  return (
    <CelvaSkin>
      <Title title={t('resources.purchase-orders.name', { smart_count: 2 })} />
      <div style={{ padding: '8px 4px 64px' }} className="fade-in">
        <div className="toolbar">
          <div className="search">
            <SearchIcon />
            <input
              placeholder={t('ui.purchase-orders.search_placeholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-primary"
            onClick={() => redirect('create', 'purchase-orders')}
          >
            <AddIcon sx={{ fontSize: 16 }} /> {t('ui.purchase-orders.new')}
          </button>
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
                {t('ui.purchase-orders.' + tt.key)}
                <span className="tcount num">{count}</span>
              </button>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Inventory2Icon sx={{ fontSize: 52 }} />}
            title={
              isLoading
                ? t('ui.purchase-orders.loading')
                : t('ui.purchase-orders.empty_title')
            }
            sub={
              isLoading || q.trim() || tab !== 'all'
                ? undefined
                : t('ui.purchase-orders.empty_sub')
            }
            actionLabel={
              isLoading || q.trim() || tab !== 'all' ? undefined : t('ui.purchase-orders.new')
            }
            onAction={
              isLoading || q.trim() || tab !== 'all'
                ? undefined
                : () => redirect('create', 'purchase-orders')
            }
          />
        ) : (
          <div className="list-wrap">
            {rows.map((p) => (
              <PORow key={p.id} p={p} onOpen={open} />
            ))}
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
