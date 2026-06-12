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

/** Status → French label + design status-class (colour binding in celva-skin.css). */
const PROD_STATUS_SKIN: Record<ProdStatus, { label: string; sc: string }> = {
  PLANNED: { label: 'Planifiée', sc: 's-todo' },
  IN_PROGRESS: { label: 'En cours', sc: 's-prod' },
  COMPLETED: { label: 'Terminée', sc: 's-done' },
  CANCELLED: { label: 'Annulée', sc: 's-neutral' },
};

const TYPE_LABEL: Record<ProdType, string> = {
  INTERNAL: 'Atelier interne',
  SUBCONTRACTED: 'Sous-traitance',
};

type Tab = { id: string; label: string; match: (p: ProductionOrder) => boolean };

const TABS: Tab[] = [
  { id: 'all', label: 'Toutes', match: () => true },
  { id: 'PLANNED', label: 'Planifiées', match: (p) => p.status === 'PLANNED' },
  { id: 'IN_PROGRESS', label: 'En cours', match: (p) => p.status === 'IN_PROGRESS' },
  { id: 'COMPLETED', label: 'Terminées', match: (p) => p.status === 'COMPLETED' },
  { id: 'CANCELLED', label: 'Annulées', match: (p) => p.status === 'CANCELLED' },
];

const ProdStatusPill = ({ status }: { status: ProdStatus }) => {
  const s = PROD_STATUS_SKIN[status];
  return (
    <span className={`pill ${s.sc}`}>
      <span className="pdot" />
      {s.label}
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
      ? 'Terminée'
      : p.status === 'PLANNED'
        ? 'À démarrer'
        : p.status === 'CANCELLED'
          ? 'Annulée'
          : p.type === 'SUBCONTRACTED'
            ? 'Chez le sous-traitant'
            : 'En cours';
  return <span className="note">{note}</span>;
};

const ProdRow = ({ p, onOpen }: { p: ProductionOrder; onOpen: (id: string) => void }) => {
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
          <span>{TYPE_LABEL[p.type]}</span>
          <span>·</span>
          <span>
            {p.quantity} {p.quantity > 1 ? 'pièces' : 'pièce'}
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
        <div className="lc-l">coût de revient / pce</div>
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
              placeholder="Rechercher un produit ou sous-traitant…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-primary"
            onClick={() => redirect('create', 'production-orders')}
          >
            <AddIcon sx={{ fontSize: 16 }} /> Production
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
                {tt.label}
                <span className="tcount num">{count}</span>
              </button>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<HandymanIcon sx={{ fontSize: 52 }} />}
            title={isLoading ? 'Chargement…' : 'Aucun ordre dans cette vue'}
            sub={
              isLoading || filtered
                ? undefined
                : 'Planifiez un ordre de production pour transformer vos matières en produits finis.'
            }
            actionLabel={isLoading || filtered ? undefined : 'Production'}
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
