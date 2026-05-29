import { useEffect, useState, type ReactNode } from 'react';
import { Title, useGetList, useNotify, useRedirect, useTranslate } from 'react-admin';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PaidIcon from '@mui/icons-material/Paid';
import { fetchJson } from '../http';
import { API_BASE } from '../config';

const TERRACOTTA = '#B26248';
const OLIVE = '#595D40';

const formatXAF = (value: string | number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));

const StatCard = ({
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

export const Home = () => {
  const t = useTranslate();
  const notify = useNotify();
  const redirect = useRedirect();

  // Counts via useGetList — it returns `total` (the envelope's top-level total,
  // which fetchJson would otherwise discard when it unwraps { data }).
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

  const [revenue, setRevenue] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchJson<{ kpis: { revenue: string } }>(`${API_BASE}/finance/dashboard`)
      .then(({ body }) => {
        if (!cancelled) setRevenue(body.kpis.revenue);
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

  const goFiltered = (resource: string, filter: Record<string, unknown>) =>
    redirect(`/${resource}?filter=${encodeURIComponent(JSON.stringify(filter))}`);

  const num = (v: number | undefined): ReactNode => (v === undefined ? '—' : v.toString());

  return (
    <Box sx={{ p: 3 }}>
      <Title title={t('menu.dashboard')} />
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label={t('dashboard.orders_to_confirm')}
            accent={TERRACOTTA}
            icon={<ReceiptLongIcon />}
            value={num(ordersPending)}
            onClick={() => goFiltered('orders', { status: 'PENDING' })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label={t('dashboard.deliveries_to_arrange')}
            accent={OLIVE}
            icon={<TwoWheelerIcon />}
            value={num(deliveriesPending)}
            onClick={() => goFiltered('deliveries', { status: 'PENDING' })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label={t('dashboard.materials_below_threshold')}
            accent={TERRACOTTA}
            icon={<WarningAmberIcon />}
            value={num(lowStock)}
            onClick={() => goFiltered('raw-materials', { lowStock: 'true' })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label={t('dashboard.revenue')}
            accent={OLIVE}
            icon={<PaidIcon />}
            value={revenue ? formatXAF(revenue) : '—'}
            onClick={() => redirect('/finance')}
          />
        </Grid>
      </Grid>
    </Box>
  );
};
