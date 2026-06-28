import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Title, useTranslate } from 'react-admin';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

type FeatureRow = { feature: string; calls: number; inputTokens: number; outputTokens: number };
type ModelRow = { model: string; calls: number; inputTokens: number; outputTokens: number };
type RecentRow = {
  id: string;
  feature: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  success: boolean;
  errorType: string | null;
  createdAt: string;
};
type Metrics = {
  totals: { calls: number; inputTokens: number; outputTokens: number; successRate: number };
  byFeature: FeatureRow[];
  byModel: ModelRow[];
  recent: RecentRow[];
};

const nf = new Intl.NumberFormat('fr-FR');

const Stat = ({ label, value }: { label: string; value: string }) => (
  <Card variant="outlined" sx={{ flex: '1 1 160px', minWidth: 160 }}>
    <CardContent>
      <Typography variant="h4" component="div" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
    </CardContent>
  </Card>
);

export const AiMetricsPage = () => {
  const t = useTranslate();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { body } = await fetchJson<Metrics>(`${API_BASE}/ai/usage/metrics`);
        if (!cancelled) setMetrics(body);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'load failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Title title={t('ui.ai_metrics.title')} />
      <Typography variant="h5" sx={{ mb: 1 }}>
        {t('ui.ai_metrics.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('ui.ai_metrics.subtitle')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {metrics && (
        <Stack spacing={4}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Stat label={t('ui.ai_metrics.total_calls')} value={nf.format(metrics.totals.calls)} />
            <Stat
              label={t('ui.ai_metrics.input_tokens')}
              value={nf.format(metrics.totals.inputTokens)}
            />
            <Stat
              label={t('ui.ai_metrics.output_tokens')}
              value={nf.format(metrics.totals.outputTokens)}
            />
            <Stat
              label={t('ui.ai_metrics.success_rate')}
              value={`${Math.round(metrics.totals.successRate * 100)}%`}
            />
          </Stack>

          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {t('ui.ai_metrics.by_feature')}
            </Typography>
            <SummaryTable
              t={t}
              keyLabel={t('ui.ai_metrics.feature')}
              rows={metrics.byFeature.map((r) => ({ key: r.feature, ...r }))}
            />
          </Box>

          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {t('ui.ai_metrics.by_model')}
            </Typography>
            <SummaryTable
              t={t}
              keyLabel={t('ui.ai_metrics.model')}
              rows={metrics.byModel.map((r) => ({ key: r.model, ...r }))}
            />
          </Box>

          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {t('ui.ai_metrics.recent')}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('ui.ai_metrics.when')}</TableCell>
                  <TableCell>{t('ui.ai_metrics.feature')}</TableCell>
                  <TableCell>{t('ui.ai_metrics.model')}</TableCell>
                  <TableCell align="right">{t('ui.ai_metrics.input_tokens')}</TableCell>
                  <TableCell align="right">{t('ui.ai_metrics.output_tokens')}</TableCell>
                  <TableCell>{t('ui.ai_metrics.status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.createdAt).toLocaleString('fr-FR')}</TableCell>
                    <TableCell>{r.feature}</TableCell>
                    <TableCell>{r.model}</TableCell>
                    <TableCell align="right">{nf.format(r.inputTokens)}</TableCell>
                    <TableCell align="right">{nf.format(r.outputTokens)}</TableCell>
                    <TableCell sx={{ color: r.success ? 'success.main' : 'error.main' }}>
                      {r.success ? '✓' : (r.errorType ?? '✗')}
                    </TableCell>
                  </TableRow>
                ))}
                {metrics.recent.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary">{t('ui.ai_metrics.empty')}</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Stack>
      )}
    </Box>
  );
};

const SummaryTable = ({
  t,
  keyLabel,
  rows,
}: {
  t: (key: string) => string;
  keyLabel: string;
  rows: Array<{ key: string; calls: number; inputTokens: number; outputTokens: number }>;
}) => (
  <Table size="small">
    <TableHead>
      <TableRow>
        <TableCell>{keyLabel}</TableCell>
        <TableCell align="right">{t('ui.ai_metrics.calls')}</TableCell>
        <TableCell align="right">{t('ui.ai_metrics.input_tokens')}</TableCell>
        <TableCell align="right">{t('ui.ai_metrics.output_tokens')}</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {rows.map((r) => (
        <TableRow key={r.key}>
          <TableCell>{r.key}</TableCell>
          <TableCell align="right">{nf.format(r.calls)}</TableCell>
          <TableCell align="right">{nf.format(r.inputTokens)}</TableCell>
          <TableCell align="right">{nf.format(r.outputTokens)}</TableCell>
        </TableRow>
      ))}
      {rows.length === 0 && (
        <TableRow>
          <TableCell colSpan={4}>
            <Typography color="text.secondary">{t('ui.ai_metrics.empty')}</Typography>
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);
