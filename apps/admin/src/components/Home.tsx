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

/** Count helper — one cheap (perPage:1) list call, returns the server total. */
const useTotal = (resource: string, filter: Record<string, unknown> = {}): number | undefined => {
  const { total } = useGetList(resource, { filter, pagination: { page: 1, perPage: 1 } });
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

const ActionCard = ({ a }: { a: ActionDef }) => {
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
          <CheckIcon sx={{ fontSize: 18 }} /> À jour
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

const SETUP_STEPS: Array<{ t: string; resource: string; nav: string }> = [
  { t: 'Ajouter vos fournisseurs', resource: 'suppliers', nav: 'suppliers' },
  { t: 'Enregistrer vos matières premières et leur coût', resource: 'raw-materials', nav: 'raw-materials' },
  { t: 'Créer vos premières catégories', resource: 'categories', nav: 'categories' },
  { t: 'Lancer votre première production', resource: 'production-orders', nav: 'production-orders' },
  { t: 'Créer vos produits', resource: 'products', nav: 'products' },
  { t: 'Composer une collection', resource: 'collections', nav: 'collections' },
  { t: 'Configurer les zones de livraison', resource: 'delivery-zones', nav: 'delivery-zones' },
  { t: "Configurer vos comptes d'encaissement", resource: 'payment-accounts', nav: 'payment-accounts' },
  { t: 'Publier votre premier article', resource: 'articles', nav: 'articles' },
];

export const Home = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const { identity } = useGetIdentity();
  const [mode, setMode] = useState<'operational' | 'setup'>('operational');

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

  // Setup-completion signals (one count per onboarding step).
  const totSuppliers = useTotal('suppliers');
  const totMaterials = useTotal('raw-materials');
  const totCategories = useTotal('categories');
  const totProduction = useTotal('production-orders');
  const totProducts = useTotal('products');
  const totCollections = useTotal('collections');
  const totZones = useTotal('delivery-zones');
  const totAccounts = useTotal('payment-accounts');
  const totArticles = useTotal('articles');
  const setupDone = [
    totSuppliers,
    totMaterials,
    totCategories,
    totProduction,
    totProducts,
    totCollections,
    totZones,
    totAccounts,
    totArticles,
  ].map((v) => (v ?? 0) > 0);

  // Low-stock alerts (real raw materials under threshold).
  const { data: lowStock = [] } = useGetList<RawMaterial>('raw-materials', {
    filter: { lowStock: 'true' },
    pagination: { page: 1, perPage: 3 },
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
      label: 'Commandes à confirmer',
      value: ordersPending,
      sc: 's-urgent',
      icon: <ReceiptLongIcon />,
      foot: 'à valider',
      onClick: () => goFiltered('orders', { status: 'PENDING' }),
    },
    {
      label: 'Commandes à préparer',
      value: ordersConfirmed,
      sc: 's-todo',
      icon: <Inventory2Icon />,
      foot: 'confirmées, à emballer',
      onClick: () => goFiltered('orders', { status: 'CONFIRMED' }),
    },
    {
      label: 'Livraisons en cours',
      value: deliveriesTransit,
      sc: 's-info',
      icon: <LocalShippingIcon />,
      foot: 'en acheminement',
      onClick: () => goFiltered('deliveries', { status: 'IN_TRANSIT' }),
    },
    {
      label: 'Paiements à confirmer',
      value: ordersShipped,
      sc: 's-urgent',
      icon: <PaymentsIcon />,
      foot: 'cash à la livraison',
      onClick: () => goFiltered('orders', { status: 'SHIPPED' }),
    },
  ];

  const periodic: ActionDef[] = [
    {
      label: 'Réceptions fournisseur',
      value: poOrdered,
      sc: 's-todo',
      icon: <MoveToInboxIcon />,
      foot: 'en transit',
      onClick: () => goFiltered('purchase-orders', { status: 'ORDERED' }),
    },
    {
      label: 'Production en cours',
      value: prodInProgress,
      sc: 's-prod',
      icon: <PrecisionManufacturingIcon />,
      foot: 'atelier',
      onClick: () => goFiltered('production-orders', { status: 'IN_PROGRESS' }),
    },
    {
      label: 'Publications à valider',
      value: draftArticles,
      sc: 's-done',
      icon: <ArticleIcon />,
      foot: 'brouillons',
      onClick: () => goFiltered('articles', { isPublished: false }),
    },
    {
      label: 'Consignations à réconcilier',
      value: consignActive,
      sc: 's-done',
      icon: <HandshakeIcon />,
      foot: 'actives',
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
      salesDelta = `${pct >= 0 ? '+' : ''}${pct}% vs mois préc.`;
    }
  }

  return (
    <CelvaSkin>
      <Title title={t('menu.dashboard')} />
      <div style={{ padding: '8px 4px 64px' }} className="fade-in">
        {/* Greeting + state toggle */}
        <div className="between" style={{ alignItems: 'flex-start', marginBottom: 26 }}>
          <div>
            <div className="greeting">{firstName ? `Bonjour, ${firstName}` : 'Bonjour'}</div>
            <div className="greeting-sub">
              {mode === 'operational'
                ? 'Voici ce qui demande votre attention.'
                : 'Préparons votre boutique.'}
            </div>
          </div>
          <div className="seg">
            <button className={mode === 'operational' ? 'on' : ''} onClick={() => setMode('operational')}>
              Opérationnel
            </button>
            <button className={mode === 'setup' ? 'on' : ''} onClick={() => setMode('setup')}>
              Démarrage
            </button>
          </div>
        </div>

        {mode === 'operational' ? (
          <>
            {/* 1 — Action center */}
            <div className="section-label">Centre d’action · à traiter maintenant</div>
            <div className="action-grid" style={{ marginBottom: 14 }}>
              {daily.map((a) => (
                <ActionCard key={a.label} a={a} />
              ))}
            </div>
            <div className="action-grid" style={{ marginBottom: 26 }}>
              {periodic.map((a) => (
                <ActionCard key={a.label} a={a} />
              ))}
            </div>

            {/* 2 — Alerts */}
            {lowStock.length > 0 && (
              <div className="alert-banner" style={{ marginBottom: 28 }}>
                <WarningAmberIcon />
                <div style={{ flex: 1 }}>
                  <div className="at" style={{ marginBottom: 4 }}>
                    À surveiller
                  </div>
                  {lowStock.map((m) => (
                    <div className="alert-line" key={m.id}>
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                      <span className="ab">
                        — matière sous le seuil ({String(m.stockQty)} {m.unit}
                        {m.alertThreshold != null ? ` / seuil ${String(m.alertThreshold)}` : ''})
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8 }}>
                    <a onClick={() => goFiltered('raw-materials', { lowStock: 'true' })}>Voir le stock →</a>
                  </div>
                </div>
              </div>
            )}

            {/* 3 — Metrics */}
            <div className="section-label">Activité du mois</div>
            <div className="kpi-grid" style={{ marginBottom: 18 }}>
              <Kpi
                l="Ventes du mois"
                v={<span className="num">{fmt(revenue)}</span>}
                trend={salesTrend}
                dv={salesDelta || ' '}
              />
              <Kpi
                l="Marge nette"
                v={<span className="num">{fmt(net)}</span>}
                trend="up"
                dv={`${netPct}% du CA`}
              />
              <Kpi
                l="Commandes · panier moyen"
                v={<span className="num">{fin ? fin.kpis.orderCount : '—'}</span>}
                dv={fin ? `Panier moyen ${fmt(fin.kpis.averageOrderValue)}` : ' '}
              />
              <Kpi
                l="Top canal de vente"
                v={topChannel ? CHANNEL_LABEL[topChannel.channel] ?? topChannel.channel : '—'}
                dv={
                  topChannel && topChannelOrders > 0
                    ? `${Math.round((topChannel.orderCount / topChannelOrders) * 100)}% des commandes`
                    : ' '
                }
              />
            </div>

            {/* Sales trend sparkline */}
            <div className="card card-pad">
              <div className="between" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ margin: 0 }}>
                  Évolution des ventes
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--fg-muted)' }}>
                  pic{' '}
                  <span className="num accent">{fmtCompact(peak)} FCFA</span>
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
                <div className="note">Données de ventes à venir.</div>
              )}
            </div>
          </>
        ) : (
          <Setup setupDone={setupDone} onNav={(r) => redirect(`/${r}`)} />
        )}
      </div>
    </CelvaSkin>
  );
};

const Setup = ({ setupDone, onNav }: { setupDone: boolean[]; onNav: (r: string) => void }) => {
  const doneN = setupDone.filter(Boolean).length;
  const pct = Math.round((doneN / SETUP_STEPS.length) * 100);
  return (
    <div style={{ maxWidth: 760 }}>
      <div className="card card-pad" style={{ marginBottom: 22 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Bienvenue chez Celva
        </div>
        <div className="greeting" style={{ marginBottom: 8 }}>
          Préparons votre boutique
        </div>
        <p className="note" style={{ fontSize: 15.5, maxWidth: '52ch' }}>
          Quelques étapes pour passer en mode opérationnel. Le tableau de bord bascule
          automatiquement dès que l’essentiel est en place.
        </p>
        <div className="between" style={{ margin: '18px 0 8px' }}>
          <div className="prep-counter num">
            <span className="done-n">{doneN}</span> / {SETUP_STEPS.length} étapes
          </div>
          <div style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)', fontWeight: 600 }}>
            {pct}%
          </div>
        </div>
        <div className="setup-progress">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="checklist">
        {SETUP_STEPS.map((s, i) => (
          <button
            key={s.t}
            className={`check-row${setupDone[i] ? ' done' : ''}`}
            onClick={() => onNav(s.nav)}
          >
            <span className="check-box">{setupDone[i] && <CheckIcon sx={{ fontSize: 16 }} />}</span>
            <span className="ct">{s.t}</span>
            {!setupDone[i] && <span className="cgo">Commencer →</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
