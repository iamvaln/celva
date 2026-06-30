import { useEffect, useMemo, useState } from 'react';
import { Title, useNotify, useTranslate } from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

type Dashboard = {
  window: { from: string; to: string };
  kpis: {
    revenue: string;
    expenses: string;
    net: string;
    orderCount: number;
    deliveredOrderCount: number;
    averageOrderValue: string;
  };
  timeseries: Array<{ month: string; revenue: string; expenses: string }>;
  revenueByChannel: Array<{ channel: string; total: string; orderCount: number }>;
  expensesByCategory: Array<{ category: string; total: string }>;
};

const formatXAF = (value: string | number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));

const formatCompactXAF = (value: number): string =>
  new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const startOfMonthIso = (): string => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const KpiCard = ({
  label,
  value,
  subtle,
}: {
  label: string;
  value: string;
  subtle?: string;
}) => (
  <Card>
    <CardContent>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ mt: 1, fontWeight: 500 }}>
        {value}
      </Typography>
      {subtle && (
        <Typography variant="caption" color="text.secondary">
          {subtle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const CHANNEL_COLOR = '#B26248';
const EXPENSE_COLOR = '#595D40';

export const FinanceDashboard = () => {
  const t = useTranslate();
  const notify = useNotify();
  const [from, setFrom] = useState<string>(startOfMonthIso());
  const [to, setTo] = useState<string>(todayIso());
  const [data, setData] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setBusy(true);
        // ISO dates with time. `to` is exclusive in the API so push to next day.
        const fromIso = `${from}T00:00:00.000Z`;
        const toIso = `${to}T23:59:59.999Z`;
        const { body } = await fetchJson<Dashboard>(
          `${API_BASE}/finance/dashboard?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
        );
        if (!cancelled) setData(body);
      } catch (err) {
        if (!cancelled) {
          notify(err instanceof Error ? err.message : t('ra.notification.http_error'), {
            type: 'error',
          });
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [from, to, notify, t]);

  const timeseries = useMemo(
    () =>
      data?.timeseries.map((r) => ({
        month: r.month,
        revenue: Number(r.revenue),
        expenses: Number(r.expenses),
      })) ?? [],
    [data],
  );
  const channels = useMemo(
    () =>
      data?.revenueByChannel.map((r) => ({
        channel: r.channel,
        total: Number(r.total),
        orderCount: r.orderCount,
      })) ?? [],
    [data],
  );
  const expenses = useMemo(
    () =>
      data?.expensesByCategory.map((r) => ({
        category: r.category,
        total: Number(r.total),
      })) ?? [],
    [data],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Title title={t('resources.finance.title')} />

      {/* Date range picker */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="end">
        <TextField
          label={t('resources.finance.from')}
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <TextField
          label={t('resources.finance.to')}
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        {busy && (
          <Typography variant="caption" color="text.secondary">
            {t('resources.finance.loading')}
          </Typography>
        )}
      </Stack>

      {/* KPI row */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label={t('resources.finance.kpi.revenue')}
            value={formatXAF(data?.kpis.revenue ?? 0)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label={t('resources.finance.kpi.expenses')}
            value={formatXAF(data?.kpis.expenses ?? 0)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label={t('resources.finance.kpi.net')}
            value={formatXAF(data?.kpis.net ?? 0)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label={t('resources.finance.kpi.orders')}
            value={String(data?.kpis.orderCount ?? 0)}
            subtle={
              data
                ? t('resources.finance.kpi.delivered_subtle', {
                    n: data.kpis.deliveredOrderCount,
                  })
                : ''
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label={t('resources.finance.kpi.aov')}
            value={formatXAF(data?.kpis.averageOrderValue ?? 0)}
          />
        </Grid>
      </Grid>

      {/* Timeseries */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('resources.finance.timeseries.title')}
          </Typography>
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeseries}>
                <CartesianGrid stroke="#D4C4AE" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#8C8680" />
                <YAxis stroke="#8C8680" tickFormatter={formatCompactXAF} />
                <Tooltip formatter={(v) => formatXAF(Number(v ?? 0))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name={t('resources.finance.kpi.revenue')}
                  stroke="#B26248"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name={t('resources.finance.kpi.expenses')}
                  stroke="#595D40"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Two breakdown charts side by side */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('resources.finance.revenue_by_channel')}
              </Typography>
              {channels.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('resources.finance.empty')}
                </Typography>
              ) : (
                <Box sx={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={channels} layout="vertical">
                      <CartesianGrid stroke="#D4C4AE" strokeDasharray="3 3" />
                      <XAxis type="number" stroke="#8C8680" tickFormatter={formatCompactXAF} />
                      <YAxis dataKey="channel" type="category" stroke="#8C8680" width={100} />
                      <Tooltip formatter={(v) => formatXAF(Number(v ?? 0))} />
                      <Bar dataKey="total" radius={[0, 0, 0, 0]}>
                        {channels.map((_, i) => (
                          <Cell key={i} fill={CHANNEL_COLOR} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t('resources.finance.expenses_by_category')}
              </Typography>
              {expenses.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('resources.finance.empty')}
                </Typography>
              ) : (
                <Box sx={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenses} layout="vertical">
                      <CartesianGrid stroke="#D4C4AE" strokeDasharray="3 3" />
                      <XAxis type="number" stroke="#8C8680" tickFormatter={formatCompactXAF} />
                      <YAxis dataKey="category" type="category" stroke="#8C8680" width={130} />
                      <Tooltip formatter={(v) => formatXAF(Number(v ?? 0))} />
                      <Bar dataKey="total" radius={[0, 0, 0, 0]}>
                        {expenses.map((_, i) => (
                          <Cell key={i} fill={EXPENSE_COLOR} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
