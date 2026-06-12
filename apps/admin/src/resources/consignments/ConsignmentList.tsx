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

/** Status → translation key + design status-class (colour binding in celva-skin.css). */
const STATUS_SKIN: Record<CStatus, { key: string; sc: string }> = {
  ACTIVE: { key: 'status_active', sc: 's-info' },
  RECONCILED: { key: 'status_reconciled', sc: 's-neutral' },
  CANCELLED: { key: 'status_cancelled', sc: 's-neutral' },
};

type Tab = { id: string; key: string; match: (c: Consignment) => boolean };

const TABS: Tab[] = [
  { id: 'all', key: 'tab_all', match: () => true },
  { id: 'ACTIVE', key: 'tab_active', match: (c) => c.status === 'ACTIVE' },
  { id: 'RECONCILED', key: 'tab_reconciled', match: (c) => c.status === 'RECONCILED' },
  { id: 'CANCELLED', key: 'tab_cancelled', match: (c) => c.status === 'CANCELLED' },
];

const CStatusPill = ({ status }: { status: CStatus }) => {
  const t = useTranslate();
  const s = STATUS_SKIN[status];
  return (
    <span className={`pill ${s.sc}`}>
      <span className="pdot" />
      {t('ui.consignments.' + s.key)}
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
  const t = useTranslate();
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
          <span>{n + (n > 1 ? ' ' + t('ui.consignments.refs') : ' ' + t('ui.consignments.ref'))}</span>
          <span>·</span>
          <span>
            {c.status === 'RECONCILED' && c.reconciledAt
              ? t('ui.consignments.reconciled_on', { date: dateFr(c.reconciledAt) })
              : t('ui.consignments.released_on', { date: dateFr(c.releasedAt) })}
          </span>
          {stale && (
            <span className="age-flag">
              <WarningAmberIcon sx={{ fontSize: 13 }} />
              {t('ui.consignments.days_on_field', { days: daysSince(c.releasedAt) })}
            </span>
          )}
        </div>
      </div>
      <div />
      <div className="lcell">
        <div className="lc-v num">{out}</div>
        <div className="lc-l">
          {c.status === 'ACTIVE'
            ? t('ui.consignments.pieces_out_label')
            : t('ui.consignments.pieces_taken_label')}
        </div>
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
              placeholder={t('ui.consignments.search_placeholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => redirect('create', 'consignments')}>
            <AddIcon sx={{ fontSize: 16 }} /> {t('ui.consignments.new')}
          </button>
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v num">{summary.activeCount}</div>
            <div className="ds-l">{t('ui.consignments.summary_active')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v num">{summary.piecesOut}</div>
            <div className="ds-l">{t('ui.consignments.summary_pieces_field')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v num">{fmtFCFA(summary.value)}</div>
            <div className="ds-l">{t('ui.consignments.summary_value')}</div>
          </div>
          <div className={`ds-item${summary.stale ? ' warn' : ''}`}>
            <div className="ds-v num">{summary.stale}</div>
            <div className="ds-l">{t('ui.consignments.summary_stale', { days: STALE_DAYS })}</div>
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
                {t('ui.consignments.' + tt.key)}
                <span className="tcount num">{count}</span>
              </button>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<WorkOutlineIcon sx={{ fontSize: 52 }} />}
            title={
              isLoading ? t('ui.consignments.loading') : t('ui.consignments.empty_title')
            }
            sub={
              isLoading || filtered
                ? undefined
                : t('ui.consignments.empty_sub')
            }
            actionLabel={isLoading || filtered ? undefined : t('ui.consignments.new')}
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
