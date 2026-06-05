import { useEffect, useMemo, useState } from 'react';
import { Title, useNotify, useTranslate } from 'react-admin';
import { Box, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import type { PaymentAccountBalance } from '../../types';
import { maskIdentifier } from '../payment-accounts/constants';

const formatXAF = (value: string | number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));

const TYPE_COLOR: Record<string, string> = {
  CASH: '#595D40',
  ORANGE_MONEY: '#B26248',
  MTN_MOMO: '#C8A951',
  BANK: '#4A6FA5',
};

export const TreasuryView = () => {
  const t = useTranslate();
  const notify = useNotify();
  const [accounts, setAccounts] = useState<PaymentAccountBalance[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setBusy(true);
        const { body } = await fetchJson<PaymentAccountBalance[]>(
          `${API_BASE}/payment-accounts/balances`,
        );
        if (!cancelled) setAccounts(body);
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
  }, [notify, t]);

  const total = useMemo(
    () => (accounts ?? []).reduce((sum, a) => sum + Number(a.balance), 0),
    [accounts],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Title title={t('resources.treasury.title')} />

      <Stack direction="row" spacing={2} alignItems="baseline" sx={{ mb: 3 }}>
        <Typography variant="h6">{t('resources.treasury.total')}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {formatXAF(total)}
        </Typography>
        {busy && (
          <Typography variant="caption" color="text.secondary">
            {t('resources.treasury.loading')}
          </Typography>
        )}
      </Stack>

      {accounts && accounts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('resources.treasury.empty')}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {(accounts ?? []).map((account) => (
            <Grid item xs={12} sm={6} md={4} key={account.id}>
              <Card sx={{ opacity: account.isActive ? 1 : 0.6 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                      {account.name}
                    </Typography>
                    <Chip
                      label={account.type}
                      size="small"
                      sx={{
                        bgcolor: TYPE_COLOR[account.type] ?? '#8C8680',
                        color: '#fff',
                      }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {maskIdentifier(account.identifier)}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1.5, fontWeight: 600 }}>
                    {formatXAF(account.balance)}
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="caption" color="success.main">
                      ↑ {formatXAF(account.income)}
                    </Typography>
                    <Typography variant="caption" color="error.main">
                      ↓ {formatXAF(account.expense)}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
