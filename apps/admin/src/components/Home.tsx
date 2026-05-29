import { useEffect, useState, type ReactNode } from 'react';
import {
  Title,
  useGetList,
  useLocaleState,
  useNotify,
  useRedirect,
  useTranslate,
} from 'react-admin';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { AuditLog } from '../types';
import { fetchJson } from '../http';
import { API_BASE } from '../config';

// Best-effort: when an audit entry's entity has a clear admin route, the row
// click jumps to it. Unknown entities just don't navigate.
const ENTITY_ROUTE: Record<string, string> = {
  Order: 'orders',
  Product: 'products',
  ProductVariant: 'variants',
  User: 'users',
  Delivery: 'deliveries',
  Article: 'articles',
  Category: 'categories',
  Collection: 'collections',
  Supplier: 'suppliers',
  RawMaterial: 'raw-materials',
  PurchaseOrder: 'purchase-orders',
  ProductionOrder: 'production-orders',
  Consignment: 'consignments',
  SizeGuide: 'size-guides',
  NewsletterSubscriber: 'newsletter',
  PromoCode: 'promo-codes',
};

const TERRACOTTA = '#B26248';
const OLIVE = '#595D40';
const GRID = '#D4C4AE';
const AXIS = '#8C8680';

type Dashboard = {
  kpis: {
    revenue: string;
    expenses: string;
    net: string;
    orderCount: number;
    deliveredOrderCount: number;
    averageOrderValue: string;
  };
  timeseries: Array<{ month: string; revenue: string; expenses: string }>;
};

const formatXAF = (value: string | number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));

const formatCompactXAF = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const relativeTime = (iso: string, locale: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale === 'fr' ? 'fr' : 'en', { numeric: 'auto' });
  const mins = Math.round(diffMs / 60000);
  if (Math.abs(mins) < 60) return rtf.format(-mins, 'minute');
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
};

const SectionHeading = ({ children }: { children: ReactNode }) => (
  <Typography variant="overline" sx={{ letterSpacing: 1.5, color: 'text.secondary' }}>
    {children}
  </Typography>
);

// ─── 1. Needs attention ──────────────────────────────────────────────────

const ActionCard = ({
  label,
  value,
  icon,
  accent,
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent: string;
  onClick: () => void;
}) => (
  <Card sx={{ height: '100%' }}>
    <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: accent }}>
          {icon}
          <Typography variant="overline" color="text.secondary">
            {label}
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ mt: 1, fontWeight: 500 }}>
          {value}
        </Typography>
      </CardContent>
    </CardActionArea>
  </Card>
);

// ─── 2. Business health ────────────────────────────────────────────────────

const KpiTile = ({ label, value }: { label: string; value: ReactNode }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 500 }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

export const Home = () => {
  const t = useTranslate();
  const notify = useNotify();
  const redirect = useRedirect();

  const { total: ordersPending } = useGetList('orders', {
    filter: { status: 'PENDING' },
    pagination: { page: 1, perPage: 1 },
  });
  const { total: deliveriesPending } = useGetList('deliveries', {
    filter: { status: 'PENDING' },
    pagination: { page: 1, perPage: 1 },
  });
  const { total: lowStock } = useGetList('raw-materials', {
    filter: { lowStock: 'true' },
    pagination: { page: 1, perPage: 1 },
  });
  const { data: recentLogs = [] } = useGetList<AuditLog>('audit-logs', {
    sort: { field: 'createdAt', order: 'DESC' },
    pagination: { page: 1, perPage: 6 },
  });

  const [fin, setFin] = useState<Dashboard | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchJson<Dashboard>(`${API_BASE}/finance/dashboard`)
      .then(({ body }) => {
        if (!cancelled) setFin(body);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          notify(err instanceof Error ? err.message : t('ra.notification.http_error'), {
            type: 'error',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [notify, t]);

  const [locale] = useLocaleState();
  const goFiltered = (resource: string, filter: Record<string, unknown>) =>
    redirect(`/${resource}?filter=${encodeURIComponent(JSON.stringify(filter))}`);
  const num = (v: number | undefined): ReactNode => (v === undefined ? '—' : v.toString());

  const trend = (fin?.timeseries ?? []).map((p) => ({
    month: p.month.slice(5),
    revenue: Number(p.revenue),
    expenses: Number(p.expenses),
  }));

  return (
    <Box sx={{ p: 3 }}>
      <Title title={t('menu.dashboard')} />

      {/* 1 — Needs attention */}
      <SectionHeading>{t('dashboard.section_attention')}</SectionHeading>
      <Grid container spacing={2} sx={{ mt: 0, mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            label={t('dashboard.orders_to_confirm')}
            accent={TERRACOTTA}
            icon={<ReceiptLongIcon />}
            value={num(ordersPending)}
            onClick={() => goFiltered('orders', { status: 'PENDING' })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            label={t('dashboard.deliveries_to_arrange')}
            accent={OLIVE}
            icon={<TwoWheelerIcon />}
            value={num(deliveriesPending)}
            onClick={() => goFiltered('deliveries', { status: 'PENDING' })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <ActionCard
            label={t('dashboard.materials_below_threshold')}
            accent={TERRACOTTA}
            icon={<WarningAmberIcon />}
            value={num(lowStock)}
            onClick={() => goFiltered('raw-materials', { lowStock: 'true' })}
          />
        </Grid>
      </Grid>

      {/* 2 — Business health */}
      <SectionHeading>{t('dashboard.section_health')}</SectionHeading>
      <Grid container spacing={2} sx={{ mt: 0, mb: 2 }}>
        <Grid item xs={6} md={3}>
          <KpiTile
            label={t('dashboard.kpi_revenue')}
            value={fin ? formatXAF(fin.kpis.revenue) : '—'}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile label={t('dashboard.kpi_net')} value={fin ? formatXAF(fin.kpis.net) : '—'} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile
            label={t('dashboard.kpi_aov')}
            value={fin ? formatXAF(fin.kpis.averageOrderValue) : '—'}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile
            label={t('dashboard.kpi_orders')}
            value={fin ? `${fin.kpis.orderCount}` : '—'}
          />
        </Grid>
      </Grid>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t('dashboard.sales_trend')}
          </Typography>
          <Box sx={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke={AXIS} fontSize={12} />
                <YAxis
                  stroke={AXIS}
                  fontSize={12}
                  tickFormatter={(v) => formatCompactXAF(Number(v))}
                  width={48}
                />
                <Tooltip formatter={(v) => formatXAF(Number(v ?? 0))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name={t('dashboard.kpi_revenue')}
                  stroke={TERRACOTTA}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name={t('dashboard.expenses')}
                  stroke={OLIVE}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* 3 — Recent activity (audit log) */}
      <SectionHeading>{t('dashboard.section_recent')}</SectionHeading>
      <Card sx={{ mt: 1 }}>
        <CardContent sx={{ p: 0 }}>
          {recentLogs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              {t('dashboard.no_recent')}
            </Typography>
          ) : (
            <Stack divider={<Divider />}>
              {recentLogs.map((log) => {
                const route = ENTITY_ROUTE[log.entity];
                const clickable = Boolean(route);
                return (
                  <Box
                    key={log.id}
                    onClick={
                      clickable ? () => redirect('show', route, log.entityId) : undefined
                    }
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      px: 2,
                      py: 1.5,
                      cursor: clickable ? 'pointer' : 'default',
                      '&:hover': clickable ? { bgcolor: 'action.hover' } : undefined,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {log.user?.name ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {relativeTime(log.createdAt, locale)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Chip label={log.action} size="small" variant="outlined" />
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {log.entity}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
