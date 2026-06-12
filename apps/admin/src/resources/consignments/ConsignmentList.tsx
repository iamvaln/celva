import './consignments.css';
import { useMemo, useState } from 'react';
import { Title, useGetList, useRedirect, useTranslate } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { Consignment } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA } from '../orders/orderSkin';

type CStatus = Consignment['status'];

/** Active consignments older than this many days are flagged on the row. */
const STALE_DAYS = 14;

/** Status → French label + design status-class (colour binding in celva-skin.css). */
const STATUS_SKIN: Record<CStatus, { label: string; sc: string }> = {
  ACTIVE: { label: 'Active', sc: 's-info' },
  RECONCILED: { label: 'Réconciliée', sc: 's-neutral' },
  CANCELLED: { label: 'Annulée', sc: 's-neutral' },
};

type Tab = { id: string; label: string; match: (c: Consignment) => boolean };

const TABS: Tab[] = [
  { id: 'all', label: 'Toutes', match: () => true },
  { id: 'ACTIVE', label: 'Actives', match: (c) => c.status === 'ACTIVE' },
  { id: 'RECONCILED', label: 'Réconciliées', match: (c) => c.status === 'RECONCILED' },
  { id: 'CANCELLED', label: 'Annulées', match: (c) => c.status === 'CANCELLED' },
];

const CStatusPill = ({ status }: { status: CStatus }) => {
  const s = STATUS_SKIN[status];
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

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';

const shortRef = (id: string): string => `#${id.slice(0, 8).toUpperCase()}`;

/** Unit price for a line: variant override falls back to product display price. */
const unitPrice = (it: Consignment['items'][number]): number =>
  Number(it.variant.priceOverride ?? it.variant.product.displayPrice);

/** Pieces still on the field for an active consignment (taken minus settled). */
const piecesOut = (c: Consignment): number =>
  c.items.reduce(
    (n, it) => n + (it.quantityTaken - it.quantitySold - it.quantityReturned),
    0,
  );

const piecesTaken = (c: Consignment): number =>
  c.items.reduce((n, it) => n + it.quantityTaken, 0);

/** Consigned value still on the field (pieces out × unit price). */
const consignedValue = (c: Consignment): number =>
  c.items.reduce(
    (s, it) =>
      s + (it.quantityTaken - it.quantitySold - it.quantityReturned) * unitPrice(it),
    0,
  );

const daysSince = (iso: string): number =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

const isStale = (c: Consignment): boolean =>
  c.status === 'ACTIVE' && daysSince(c.releasedAt) > STALE_DAYS;

const ConsignmentRow = ({ c, onOpen }: { c: Consignment; onOpen: (id: string) => void }) => {
  const sc = STATUS_SKIN[c.status].sc;
  const n = c.items.length;
  const stale = isStale(c);
  const out = c.status === 'ACTIVE' ? piecesOut(c) : piecesTaken(c);
  return (
    <div className={`lrow csg ${sc}`} onClick={() => onOpen(c.id)}>
      <div className="obar" />
      <div className="csg-av">{initials(c.salesRep.name)}</div>
      <div style={{ minWidth: 0 }}>
        <div className="csg-head">
          <span className="csg-ref">{shortRef(c.id)}</span>
          <span className="lname">{c.salesRep.name}</span>
        </div>
        <div className="lsub">
          <span>{n + (n > 1 ? ' références' : ' référence')}</span>
          <span>·</span>
          <span>
            {c.status === 'RECONCILED' && c.reconciledAt
              ? `réconciliée le ${dateFr(c.reconciledAt)}`
              : `confiée le ${dateFr(c.releasedAt)}`}
          </span>
          {stale && (
            <span className="age-flag">
              <WarningAmberIcon sx={{ fontSize: 13 }} />
              {daysSince(c.releasedAt)} j sur le terrain
            </span>
          )}
        </div>
      </div>
      <div />
      <div className="lcell">
        <div className="lc-v num">{out}</div>
        <div className="lc-l">{c.status === 'ACTIVE' ? 'pièces dehors' : 'pièces confiées'}</div>
      </div>
      <div className="lchev">
        <CStatusPill status={c.status} />
        <ChevronRightIcon sx={{ fontSize: 18 }} />
      </div>
    </div>
  );
};

export const ConsignmentList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const [tab, setTab] = useState<string>('all');
  const [q, setQ] = useState('');

  const { data: consignments = [], isLoading } = useGetList<Consignment>('consignments', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'releasedAt', order: 'DESC' },
  });

  const open = (id: string) => redirect('show', 'consignments', id);

  const summary = useMemo(() => {
    const active = consignments.filter((c) => c.status === 'ACTIVE');
    return {
      activeCount: active.length,
      piecesOut: active.reduce((n, c) => n + piecesOut(c), 0),
      value: active.reduce((s, c) => s + consignedValue(c), 0),
      stale: active.filter(isStale).length,
    };
  }, [consignments]);

  const rows = useMemo(() => {
    const tabDef = TABS.find((tt) => tt.id === tab) ?? TABS[0]!;
    let r = consignments.filter(tabDef.match);
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter(
        (c) =>
          c.salesRep.name.toLowerCase().includes(qq) ||
          c.salesRep.email.toLowerCase().includes(qq) ||
          shortRef(c.id).toLowerCase().includes(qq),
      );
    }
    return r;
  }, [consignments, tab, q]);

  const filtered = q.trim().length > 0 || tab !== 'all';

  return (
    <CelvaSkin>
      <Title title={t('resources.consignments.name', { smart_count: 2 })} />
      <div style={{ padding: '8px 4px 64px' }} className="fade-in">
        <div className="toolbar">
          <div className="search">
            <SearchIcon />
            <input
              placeholder="Rechercher un commercial…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => redirect('create', 'consignments')}>
            <AddIcon sx={{ fontSize: 16 }} /> Consignation
          </button>
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v num">{summary.activeCount}</div>
            <div className="ds-l">Consignations actives</div>
          </div>
          <div className="ds-item">
            <div className="ds-v num">{summary.piecesOut}</div>
            <div className="ds-l">Pièces sur le terrain</div>
          </div>
          <div className="ds-item">
            <div className="ds-v num">{fmtFCFA(summary.value)}</div>
            <div className="ds-l">Valeur consignée</div>
          </div>
          <div className={`ds-item${summary.stale ? ' warn' : ''}`}>
            <div className="ds-v num">{summary.stale}</div>
            <div className="ds-l">Actives &gt; {STALE_DAYS} jours</div>
          </div>
        </div>

        <div className="tabs">
          {TABS.map((tt) => {
            const count = consignments.filter(tt.match).length;
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
            icon={<WorkOutlineIcon sx={{ fontSize: 52 }} />}
            title={isLoading ? 'Chargement…' : 'Aucune consignation dans cette vue'}
            sub={
              isLoading || filtered
                ? undefined
                : 'Confiez du stock à un commercial pour la vente terrain.'
            }
            actionLabel={isLoading || filtered ? undefined : 'Consignation'}
            onAction={isLoading || filtered ? undefined : () => redirect('create', 'consignments')}
          />
        ) : (
          <div className="list-wrap">
            {rows.map((c) => (
              <ConsignmentRow key={c.id} c={c} onOpen={open} />
            ))}
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
