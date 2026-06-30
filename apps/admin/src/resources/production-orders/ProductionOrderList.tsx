import './production-orders.css';
import { useMemo, useState } from 'react';
import { Title, useGetList, useRedirect, useTranslate } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import HandymanIcon from '@mui/icons-material/Handyman';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { ProductionOrder } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA } from '../orders/orderSkin';

type ProdStatus = ProductionOrder['status'];
type ProdType = ProductionOrder['type'];

/** Status → translation key + design status-class (colour binding in celva-skin.css). */
const PROD_STATUS_SKIN: Record<ProdStatus, { key: string; sc: string }> = {
  PLANNED: { key: 'status_planned', sc: 's-todo' },
  IN_PROGRESS: { key: 'status_in_progress', sc: 's-prod' },
  COMPLETED: { key: 'status_completed', sc: 's-done' },
  CANCELLED: { key: 'status_cancelled', sc: 's-neutral' },
};

const TYPE_KEY: Record<ProdType, string> = {
  INTERNAL: 'type_internal',
  SUBCONTRACTED: 'type_subcontracted',
};

type Tab = { id: string; key: string; match: (p: ProductionOrder) => boolean };

const TABS: Tab[] = [
  { id: 'all', key: 'tab_all', match: () => true },
  { id: 'PLANNED', key: 'tab_planned', match: (p) => p.status === 'PLANNED' },
  { id: 'IN_PROGRESS', key: 'tab_in_progress', match: (p) => p.status === 'IN_PROGRESS' },
  { id: 'COMPLETED', key: 'tab_completed', match: (p) => p.status === 'COMPLETED' },
  { id: 'CANCELLED', key: 'tab_cancelled', match: (p) => p.status === 'CANCELLED' },
];

const ProdStatusPill = ({ status }: { status: ProdStatus }) => {
  const t = useTranslate();
  const s = PROD_STATUS_SKIN[status];
  return (
    <span className={`pill ${s.sc}`}>
      <span className="pdot" />
      {t('ui.production-orders.' + s.key)}
    </span>
  );
};

const dateFr = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );

const productName = (p: ProductionOrder): string => p.product?.name?.fr ?? p.product?.slug ?? '—';

/** Per-piece cost of goods: (labour or subcontract) ÷ quantity. */
const unitCost = (p: ProductionOrder): number => {
  const run = p.type === 'SUBCONTRACTED' ? Number(p.subcontractCost) : Number(p.laborCost);
  return p.quantity > 0 ? run / p.quantity : 0;
};

/** Stage timeline progress (done / total), used for IN_PROGRESS internal runs. */
const stageProgress = (p: ProductionOrder): { done: number; total: number } => {
  const total = p.stages?.length ?? 0;
  const done = p.stages?.filter((s) => s.status === 'COMPLETED').length ?? 0;
  return { done, total };
};

const ProdMidCell = ({ p }: { p: ProductionOrder }) => {
  const t = useTranslate();
  if (p.status === 'IN_PROGRESS' && p.type === 'INTERNAL') {
    const { done, total } = stageProgress(p);
    if (total > 0) {
      const pct = Math.round((done / total) * 100);
      return (
        <div className={`pmeter${done === total ? ' done' : ''}`} style={{ justifyContent: 'flex-end' }}>
          <div className="pm-track">
            <div className="pm-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="pm-txt">
            {done}/{total}
          </span>
        </div>
      );
    }
  }
  const note =
    p.status === 'COMPLETED'
      ? t('ui.production-orders.note_completed')
      : p.status === 'PLANNED'
        ? t('ui.production-orders.note_to_start')
        : p.status === 'CANCELLED'
          ? t('ui.production-orders.note_cancelled')
          : p.type === 'SUBCONTRACTED'
            ? t('ui.production-orders.note_at_subcontractor')
            : t('ui.production-orders.note_in_progress');
  return <span className="note">{note}</span>;
};

const ProdRow = ({ p, onOpen }: { p: ProductionOrder; onOpen: (id: string) => void }) => {
  const t = useTranslate();
  const sc = PROD_STATUS_SKIN[p.status].sc;
  const partner = p.type === 'SUBCONTRACTED' ? p.subcontractorName : null;
  return (
    <div className={`lrow prod ${sc}`} onClick={() => onOpen(p.id)}>
      <div className="obar" />
      <div className="prod-ic">
        <HandymanIcon sx={{ fontSize: 17 }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="prod-head">
          <span className="lname">{productName(p)}</span>
        </div>
        <div className="lsub">
          <span>{t('ui.production-orders.' + TYPE_KEY[p.type])}</span>
          <span>·</span>
          <span>
            {p.quantity}{' '}
            {p.quantity > 1
              ? t('ui.production-orders.pieces')
              : t('ui.production-orders.piece')}
          </span>
          {partner && (
            <>
              <span>·</span>
              <span>{partner}</span>
            </>
          )}
          <span>·</span>
          <span>{dateFr(p.startDate ?? p.createdAt)}</span>
        </div>
      </div>
      <ProdMidCell p={p} />
      <div className="lcell">
        <div className="lc-v num">{fmtFCFA(unitCost(p))}</div>
        <div className="lc-l">{t('ui.production-orders.unit_cost_label')}</div>
      </div>
      <div className="lchev">
        <ProdStatusPill status={p.status} />
        <ChevronRightIcon sx={{ fontSize: 18, ml: 1 }} />
      </div>
    </div>
  );
};

export const ProductionOrderList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const [tab, setTab] = useState<string>('all');
  const [q, setQ] = useState('');

  const { data: orders = [], isLoading } = useGetList<ProductionOrder>('production-orders', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'createdAt', order: 'DESC' },
  });

  const open = (id: string) => redirect('show', 'production-orders', id);

  const rows = useMemo(() => {
    const tabDef = TABS.find((tt) => tt.id === tab) ?? TABS[0]!;
    let r = orders.filter(tabDef.match);
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter(
        (p) =>
          productName(p).toLowerCase().includes(qq) ||
          (p.subcontractorName ?? '').toLowerCase().includes(qq),
      );
    }
    return r;
  }, [orders, tab, q]);

  const filtered = q.trim().length > 0 || tab !== 'all';

  return (
    <CelvaSkin>
      <Title title={t('resources.production-orders.name', { smart_count: 2 })} />
      <div style={{ padding: '8px 4px 64px' }} className="fade-in">
        <div className="toolbar">
          <div className="search">
            <SearchIcon />
            <input
              placeholder={t('ui.production-orders.search_placeholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-primary"
            onClick={() => redirect('create', 'production-orders')}
          >
            <AddIcon sx={{ fontSize: 16 }} /> {t('ui.production-orders.new')}
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
                {t('ui.production-orders.' + tt.key)}
                <span className="tcount num">{count}</span>
              </button>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<HandymanIcon sx={{ fontSize: 52 }} />}
            title={
              isLoading
                ? t('ui.production-orders.loading')
                : t('ui.production-orders.empty_title')
            }
            sub={
              isLoading || filtered
                ? undefined
                : t('ui.production-orders.empty_sub')
            }
            actionLabel={isLoading || filtered ? undefined : t('ui.production-orders.new')}
            onAction={
              isLoading || filtered ? undefined : () => redirect('create', 'production-orders')
            }
          />
        ) : (
          <div className="list-wrap">
            {rows.map((p) => (
              <ProdRow key={p.id} p={p} onOpen={open} />
            ))}
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
