import './promo-codes.css';
import { useMemo, useState } from 'react';
import { Title, useGetList, useRedirect, useTranslate } from 'react-admin';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import type { PromoCodeType } from '@celva/shared';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';

/**
 * Promo code row as serialized by the API list endpoint. Decimal columns
 * (`value`, `minOrderAmount`) arrive as strings over JSON; dates as ISO
 * strings or null. Kept LOCAL — no shared types edited.
 */
type PromoCodeRow = {
  id: string;
  code: string;
  type: PromoCodeType;
  value: string | number;
  minOrderAmount: string | number | null;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerUser: number | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
};

type StatusId = 'active' | 'inactive' | 'expired';

const fmtFCFA = (v: string | number): string =>
  new Intl.NumberFormat('fr-FR').format(Math.round(Number(v))) + ' FCFA';

/** "−20 %" for a percentage, "−5 000 FCFA" for a fixed amount. */
const reduction = (p: PromoCodeRow): string =>
  p.type === 'PERCENTAGE' ? `−${Number(p.value)} %` : `−${fmtFCFA(p.value)}`;

const isExpired = (p: PromoCodeRow, now: number): boolean =>
  p.expiresAt != null && new Date(p.expiresAt).getTime() < now;

const statusOf = (p: PromoCodeRow, now: number): StatusId => {
  if (isExpired(p, now)) return 'expired';
  return p.isActive ? 'active' : 'inactive';
};

/** Status → French label + design status-class (color binding in celva-skin.css). */
const STATUS: Record<StatusId, { label: string; sc: string }> = {
  active: { label: 'Actif', sc: 's-done' },
  expired: { label: 'Expiré', sc: 's-neutral' },
  inactive: { label: 'Inactif', sc: 's-neutral' },
};

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/** "1 juin 2026 → 30 juin 2026" / "dès le 1 juin" / "jusqu'au 30 juin" / "illimitée". */
const validity = (p: PromoCodeRow): string => {
  const from = p.startsAt ? fmtDate(p.startsAt) : null;
  const to = p.expiresAt ? fmtDate(p.expiresAt) : null;
  if (from && to) return `${from} → ${to}`;
  if (from) return `dès le ${from}`;
  if (to) return `jusqu'au ${to}`;
  return 'illimitée';
};

const TABS: Array<{ id: StatusId | 'all'; label: string }> = [
  { id: 'active', label: 'Actifs' },
  { id: 'inactive', label: 'Inactifs' },
  { id: 'expired', label: 'Expirés' },
  { id: 'all', label: 'Tous' },
];

export const PromoCodeList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const [tab, setTab] = useState<StatusId | 'all'>('active');
  const [q, setQ] = useState('');

  const { data = [], isLoading } = useGetList<PromoCodeRow>('promo-codes', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'createdAt', order: 'DESC' },
  });

  // Single timestamp per render so tab counts and row statuses agree.
  const now = Date.now();

  const counts = useMemo(() => {
    const c: Record<StatusId | 'all', number> = {
      active: 0,
      inactive: 0,
      expired: 0,
      all: data.length,
    };
    for (const p of data) c[statusOf(p, now)] += 1;
    return c;
  }, [data, now]);

  const rows = useMemo(() => {
    let r = data;
    if (tab !== 'all') r = r.filter((p) => statusOf(p, now) === tab);
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      r = r.filter((p) => p.code.toLowerCase().includes(qq));
    }
    return r;
  }, [data, tab, q, now]);

  return (
    <CelvaSkin>
      <Title title={t('resources.promo-codes.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="toolbar">
          <div className="search">
            <SearchIcon />
            <input
              placeholder="Rechercher un code…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => redirect('create', 'promo-codes')}>
            <AddIcon sx={{ fontSize: 16 }} /> Code promo
          </button>
        </div>

        <div className="tabs">
          {TABS.map((tt) => (
            <button
              key={tt.id}
              className={`tab${tt.id === tab ? ' active' : ''}`}
              onClick={() => setTab(tt.id)}
            >
              {tt.label}
              <span className="tcount num">{counts[tt.id]}</span>
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<LocalOfferIcon sx={{ fontSize: 40 }} />}
              title={
                isLoading
                  ? t('ra.page.loading')
                  : q.trim()
                    ? 'Aucun code ne correspond à la recherche'
                    : 'Aucun code promo pour ce filtre'
              }
              {...(!isLoading && !q.trim()
                ? {
                    actionLabel: 'Créer un code promo',
                    onAction: () => redirect('create', 'promo-codes'),
                  }
                : {})}
            />
          </div>
        ) : (
          <div className="list-wrap">
            {rows.map((p) => {
              const st = STATUS[statusOf(p, now)];
              const min = p.minOrderAmount != null && Number(p.minOrderAmount) > 0;
              return (
                <div
                  key={p.id}
                  className="lrow promo"
                  onClick={() => redirect('edit', 'promo-codes', p.id)}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="lname promo-code">{p.code}</div>
                    {min && (
                      <div className="promo-sub">min. {fmtFCFA(p.minOrderAmount as string)}</div>
                    )}
                  </div>

                  <div>
                    <span className="promo-amt">{reduction(p)}</span>
                  </div>

                  <div className="lcell promo-usage">
                    <div className="lc-count">
                      {p.usedCount} / {p.maxUses ?? '∞'}
                    </div>
                    {p.maxUsesPerUser != null && (
                      <div className="lc-l">{p.maxUsesPerUser} / client</div>
                    )}
                  </div>

                  <div className="promo-validity">{validity(p)}</div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`pill ${st.sc}`}>
                      <span className="pdot" />
                      {st.label}
                    </span>
                  </div>

                  <div className="lchev">
                    <ChevronRightIcon sx={{ fontSize: 18 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
