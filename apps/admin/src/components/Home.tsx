import { useEffect, useState, type ReactNode } from 'react';
import { Title, useGetIdentity, useGetList, useRedirect, useTranslate } from 'react-admin';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentsIcon from '@mui/icons-material/Payments';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import ArticleIcon from '@mui/icons-material/Article';
import HandshakeIcon from '@mui/icons-material/Handshake';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckIcon from '@mui/icons-material/Check';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { CelvaSkin } from './CelvaSkin';
import type { RawMaterial } from '../types';
import { fetchJson } from '../http';
import { API_BASE } from '../config';

const fmt = (n: number | string): string =>
  new Intl.NumberFormat('fr-FR').format(Math.round(Number(n))) + ' FCFA';
const fmtCompact = (n: number): string =>
  Math.abs(n) >= 1_000_000
    ? (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + ' M'
    : Math.abs(n) >= 1_000
      ? Math.round(n / 1_000) + ' k'
      : String(n);

type Dashboard = {
  kpis: {
    revenue: string;
    net: string;
    orderCount: number;
    averageOrderValue: string;
  };
  timeseries: Array<{ month: string; revenue: string }>;
  revenueByChannel: Array<{ channel: string; total: string; orderCount: number }>;
};

const CHANNEL_LABEL: Record<string, string> = {
  WEBSITE: 'Boutique en ligne',
  WHATSAPP: 'WhatsApp',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  IN_PERSON: 'En personne',
};

// Each list endpoint validates sortBy against an allow-list (and rejects the
// default "id"), so count queries must request a field the resource accepts.
const SAFE_SORT: Record<string, string> = {
  orders: 'createdAt',
  deliveries: 'createdAt',
  'purchase-orders': 'createdAt',
  'production-orders': 'createdAt',
  articles: 'createdAt',
  consignments: 'createdAt',
  products: 'createdAt',
  'raw-materials': 'name',
  categories: 'sortOrder',
  collections: 'sortOrder',
  suppliers: 'name',
  users: 'createdAt',
};

/** Count helper — one cheap (perPage:1) list call, returns the server total. */
const useTotal = (resource: string, filter: Record<string, unknown> = {}): number | undefined => {
  const { total } = useGetList(resource, {
    filter,
    pagination: { page: 1, perPage: 1 },
    sort: { field: SAFE_SORT[resource] ?? 'createdAt', order: 'DESC' },
  });
  return total;
};

// ── Action card ──────────────────────────────────────────────
type ActionDef = {
  label: string;
  value: number | undefined;
  sc: string;
  icon: ReactNode;
  foot: string;
  onClick: () => void;
};

const ActionCard = ({ a, uptodate }: { a: ActionDef; uptodate: string }) => {
  const live = (a.value ?? 0) > 0;
  return (
    <button className={`action-card ${a.sc} ${live ? 'live' : 'clear'}`} onClick={a.onClick}>
      <div className="ac-top">
        {a.icon}
        <span className="ac-label">{a.label}</span>
      </div>
      {live ? (
        <>
          <div className="ac-value num">{a.value}</div>
          <div className="ac-foot">{a.foot}</div>
        </>
      ) : (
        <div className="ac-value">
          <CheckIcon sx={{ fontSize: 18 }} /> {uptodate}
        </div>
      )}
    </button>
  );
};

const Kpi = ({
  l,
  v,
  trend,
  dv,
}: {
  l: string;
  v: ReactNode;
  trend?: 'up' | 'down' | null;
  dv?: string;
}) => (
  <div className="kpi">
    <div className="kl">{l}</div>
    <div className="kv">{v}</div>
    {dv && (
      <div className={`kd ${trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'muted'}`}>
        {trend === 'up' && <ArrowUpwardIcon sx={{ fontSize: 13 }} />}
        {trend === 'down' && <ArrowDownwardIcon sx={{ fontSize: 13 }} />}
        {dv}
      </div>
    )}
  </div>
);

export const Home = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const { identity } = useGetIdentity();

  const goFiltered = (resource: string, filter: Record<string, unknown>) =>
    redirect(`/${resource}?filter=${encodeURIComponent(JSON.stringify(filter))}`);

  // Real operational counts.
  const ordersPending = useTotal('orders', { status: 'PENDING' });
  const ordersConfirmed = useTotal('orders', { status: 'CONFIRMED' });
  const ordersShipped = useTotal('orders', { status: 'SHIPPED' });
  const deliveriesTransit = useTotal('deliveries', { status: 'IN_TRANSIT' });
  const poOrdered = useTotal('purchase-orders', { status: 'ORDERED' });
  const prodInProgress = useTotal('production-orders', { status: 'IN_PROGRESS' });
  const draftArticles = useTotal('articles', { isPublished: false });
  const consignActive = useTotal('consignments', { status: 'ACTIVE' });

  // Onboarding signals (the 5 condensed setup steps shown in the banner).
  const totProducts = useTotal('products');
  const totAccounts = useTotal('payment-accounts');
  const totZones = useTotal('delivery-zones');
  const totSettings = useTotal('settings');
  const totUsers = useTotal('users');
  const onboard = [
    { key: 'store_profile', done: (totSettings ?? 0) > 0, nav: 'settings' },
    { key: 'first_product', done: (totProducts ?? 0) > 0, nav: 'products' },
    { key: 'accounts', done: (totAccounts ?? 0) > 0, nav: 'payment-accounts' },
    { key: 'delivery_zones', done: (totZones ?? 0) > 0, nav: 'delivery-zones' },
    { key: 'invite_team', done: (totUsers ?? 0) > 1, nav: 'users' },
  ];
  const onboardDone = onboard.filter((s) => s.done).length;
  const onboardPct = Math.round((onboardDone / onboard.length) * 100);
  const onboardRemaining = onboard.length - onboardDone;
  const firstIncomplete = onboard.find((s) => !s.done);

  // Low-stock alerts (real raw materials under threshold).
  const { data: lowStock = [] } = useGetList<RawMaterial>('raw-materials', {
    filter: { lowStock: 'true' },
    pagination: { page: 1, perPage: 3 },
    sort: { field: 'name', order: 'ASC' },
  });

  // Finance KPIs + sales trend.
  const [fin, setFin] = useState<Dashboard | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchJson<Dashboard>(`${API_BASE}/finance/dashboard`)
      .then(({ body }) => {
        if (!cancelled) setFin(body);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = (identity?.fullName ?? '').split(' ')[0] || '';

  const daily: ActionDef[] = [
    {
      label: t('dashboard.cards.orders_confirm'),
      value: ordersPending,
      sc: 's-urgent',
      icon: <ReceiptLongIcon />,
      foot: t('dashboard.cards.orders_confirm_foot'),
      onClick: () => goFiltered('orders', { status: 'PENDING' }),
    },
    {
      label: t('dashboard.cards.orders_prepare'),
      value: ordersConfirmed,
      sc: 's-todo',
      icon: <Inventory2Icon />,
      foot: t('dashboard.cards.orders_prepare_foot'),
      onClick: () => goFiltered('orders', { status: 'CONFIRMED' }),
    },
    {
      label: t('dashboard.cards.deliveries'),
      value: deliveriesTransit,
      sc: 's-info',
      icon: <LocalShippingIcon />,
      foot: t('dashboard.cards.deliveries_foot'),
      onClick: () => goFiltered('deliveries', { status: 'IN_TRANSIT' }),
    },
    {
      label: t('dashboard.cards.payments'),
      value: ordersShipped,
      sc: 's-urgent',
      icon: <PaymentsIcon />,
      foot: t('dashboard.cards.payments_foot'),
      onClick: () => goFiltered('orders', { status: 'SHIPPED' }),
    },
  ];

  const periodic: ActionDef[] = [
    {
      label: t('dashboard.cards.receptions'),
      value: poOrdered,
      sc: 's-todo',
      icon: <MoveToInboxIcon />,
      foot: t('dashboard.cards.receptions_foot'),
      onClick: () => goFiltered('purchase-orders', { status: 'ORDERED' }),
    },
    {
      label: t('dashboard.cards.production'),
      value: prodInProgress,
      sc: 's-prod',
      icon: <PrecisionManufacturingIcon />,
      foot: t('dashboard.cards.production_foot'),
      onClick: () => goFiltered('production-orders', { status: 'IN_PROGRESS' }),
    },
    {
      label: t('dashboard.cards.publications'),
      value: draftArticles,
      sc: 's-done',
      icon: <ArticleIcon />,
      foot: t('dashboard.cards.publications_foot'),
      onClick: () => goFiltered('articles', { isPublished: false }),
    },
    {
      label: t('dashboard.cards.consignments'),
      value: consignActive,
      sc: 's-done',
      icon: <HandshakeIcon />,
      foot: t('dashboard.cards.consignments_foot'),
      onClick: () => goFiltered('consignments', { status: 'ACTIVE' }),
    },
  ];

  const revenue = fin ? Number(fin.kpis.revenue) : 0;
  const net = fin ? Number(fin.kpis.net) : 0;
  const netPct = revenue > 0 ? Math.round((net / revenue) * 100) : 0;
  const series = (fin?.timeseries ?? []).map((p) => Number(p.revenue));
  const peak = series.length ? Math.max(...series, 1) : 1;
  const topChannel = (fin?.revenueByChannel ?? [])
    .slice()
    .sort((a, b) => Number(b.total) - Number(a.total))[0];
  const topChannelOrders = (fin?.revenueByChannel ?? []).reduce((s, c) => s + c.orderCount, 0);
  // Month-over-month sales delta from the last two timeseries points.
  let salesTrend: 'up' | 'down' | null = null;
  let salesDelta = '';
  if (series.length >= 2) {
    const prev = series[series.length - 2] ?? 0;
    const cur = series[series.length - 1] ?? 0;
    if (prev > 0) {
      const pct = Math.round(((cur - prev) / prev) * 100);
      salesTrend = pct >= 0 ? 'up' : 'down';
      salesDelta = t('dashboard.kpi_vs_prev', { pct: `${pct >= 0 ? '+' : ''}${pct}` });
    }
  }

  return (
    <CelvaSkin>
      <Title title={t('menu.dashboard')} />
      <div style={{ padding: '8px 4px 64px' }} className="fade-in">
        {/* Greeting */}
        <div style={{ marginBottom: 26 }}>
          <div className="greeting">
            {firstName ? t('dashboard.greeting', { name: firstName }) : t('dashboard.greeting_plain')}
          </div>
          <div className="greeting-sub">{t('dashboard.subtitle')}</div>
        </div>

        {/* Onboarding banner — pinned while setup is incomplete */}
        {onboardDone < onboard.length && (
          <div className="onboard-banner">
            <div className="onboard-ring" style={{ ['--p' as string]: onboardPct }}>
              <span className="or-num">
                {onboardDone}/{onboard.length}
              </span>
            </div>
            <div className="onboard-main">
              <div className="ob-t">{t('dashboard.onboard.title')}</div>
              <div className="ob-s">
                {t(
                  onboardRemaining > 1
                    ? 'dashboard.onboard.subtitle_other'
                    : 'dashboard.onboard.subtitle_one',
                  { count: onboardRemaining },
                )}
              </div>
              <div className="onboard-steps">
                {onboard.map((s) => (
                  <button
                    key={s.key}
                    className={`ob-chip${s.done ? ' done' : ''}`}
                    onClick={() => redirect(`/${s.nav}`)}
                  >
                    {s.done && (
                      <span className="obc-ic">
                        <CheckIcon sx={{ fontSize: 12 }} />
                      </span>
                    )}
                    {t(`dashboard.onboard.${s.key}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="onboard-actions">
              <button
                className="btn btn-primary"
                onClick={() => redirect(`/${(firstIncomplete ?? onboard[0]!).nav}`)}
              >
                {t('dashboard.onboard.continue')}
              </button>
            </div>
          </div>
        )}

        {/* 1 — Action center */}
        <div className="section-label">{t('dashboard.action_center')}</div>
        <div className="action-grid" style={{ marginBottom: 14 }}>
          {daily.map((a) => (
            <ActionCard key={a.label} a={a} uptodate={t('dashboard.uptodate')} />
          ))}
        </div>
        <div className="action-grid" style={{ marginBottom: 26 }}>
          {periodic.map((a) => (
            <ActionCard key={a.label} a={a} uptodate={t('dashboard.uptodate')} />
          ))}
        </div>

        {/* 2 — Alerts */}
        {lowStock.length > 0 && (
          <div className="alert-banner" style={{ marginBottom: 28 }}>
            <WarningAmberIcon />
            <div style={{ flex: 1 }}>
              <div className="at" style={{ marginBottom: 4 }}>
                {t('dashboard.alerts_title')}
              </div>
              {lowStock.map((m) => (
                <div className="alert-line" key={m.id}>
                  <span style={{ fontWeight: 500 }}>{m.name}</span>
                  <span className="ab">
                    {' — '}
                    {t('dashboard.material_below')} ({String(m.stockQty)} {m.unit}
                    {m.alertThreshold != null
                      ? ` / ${t('dashboard.threshold')} ${String(m.alertThreshold)}`
                      : ''}
                    )
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <a onClick={() => goFiltered('raw-materials', { lowStock: 'true' })}>
                  {t('dashboard.view_stock')}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 3 — Metrics */}
        <div className="section-label">{t('dashboard.activity_month')}</div>
        <div className="kpi-grid" style={{ marginBottom: 18 }}>
          <Kpi
            l={t('dashboard.kpi_sales')}
            v={<span className="num">{fmt(revenue)}</span>}
            trend={salesTrend}
            dv={salesDelta || ' '}
          />
          <Kpi
            l={t('dashboard.kpi_net')}
            v={<span className="num">{fmt(net)}</span>}
            trend="up"
            dv={t('dashboard.kpi_net_of_ca', { pct: netPct })}
          />
          <Kpi
            l={t('dashboard.kpi_orders_aov')}
            v={<span className="num">{fin ? fin.kpis.orderCount : '—'}</span>}
            dv={fin ? t('dashboard.kpi_aov', { v: fmt(fin.kpis.averageOrderValue) }) : ' '}
          />
          <Kpi
            l={t('dashboard.kpi_top_channel')}
            v={topChannel ? CHANNEL_LABEL[topChannel.channel] ?? topChannel.channel : '—'}
            dv={
              topChannel && topChannelOrders > 0
                ? t('dashboard.kpi_pct_orders', {
                    pct: Math.round((topChannel.orderCount / topChannelOrders) * 100),
                  })
                : ' '
            }
          />
        </div>

        {/* Sales trend sparkline */}
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 16 }}>
            <div className="section-label" style={{ margin: 0 }}>
              {t('dashboard.sales_evolution')}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--fg-muted)' }}>
              {t('dashboard.peak')} <span className="num accent">{fmtCompact(peak)} FCFA</span>
            </div>
          </div>
          {series.length > 0 ? (
            <div className="spark">
              {series.map((v, i) => (
                <div
                  key={i}
                  className={`bar${v === peak ? ' peak' : ''}`}
                  style={{ height: `${(v / peak) * 100}%` }}
                  title={fmt(v)}
                />
              ))}
            </div>
          ) : (
            <div className="note">{t('dashboard.sales_coming')}</div>
          )}
        </div>
      </div>
    </CelvaSkin>
  );
};
