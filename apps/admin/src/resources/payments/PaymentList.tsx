import { useMemo, useState } from 'react';
import { Title, useGetList, useNotify, useRedirect, useTranslate } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import PaymentsIcon from '@mui/icons-material/Payments';
import type { AdminPayment } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA, relativeFr } from '../orders/orderSkin';
import { downloadCsv } from '../../lib/csv';
import './payments.css';

const csvDate = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

type Tab = { id: string; match: (p: AdminPayment) => boolean };
const TABS: Tab[] = [
  { id: 'all', match: () => true },
  { id: 'received', match: (p) => p.status === 'COMPLETED' },
  { id: 'pending', match: (p) => p.status === 'PENDING' },
  { id: 'failed', match: (p) => p.status === 'FAILED' || p.status === 'REFUNDED' },
];

const STATUS_SC: Record<AdminPayment['status'], string> = {
  COMPLETED: 's-done',
  PENDING: 's-todo',
  FAILED: 's-urgent',
  REFUNDED: 's-neutral',
};

export const PaymentList = () => {
  const t = useTranslate();
  const notify = useNotify();
  const redirect = useRedirect();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useGetList<AdminPayment>('payments', {
    pagination: { page: 1, perPage: 200 },
    sort: { field: 'createdAt', order: 'DESC' },
  });

  const statusLabel = (s: AdminPayment['status']) =>
    t(`ui.payments.status_${s.toLowerCase()}`);
  const methodLabel = (m: AdminPayment['method']) =>
    t(`ui.payments.method_${m.toLowerCase()}`);

  const rows = useMemo(() => {
    const tabDef = TABS.find((x) => x.id === tab) ?? TABS[0]!;
    let r = data.filter(tabDef.match);
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter(
        (p) =>
          (p.order?.orderNumber ?? '').toLowerCase().includes(qq) ||
          (p.order?.user?.name ?? '').toLowerCase().includes(qq),
      );
    }
    return r;
  }, [data, tab, q]);

  const exportCsv = () => {
    downloadCsv<AdminPayment>(
      'paiements',
      [
        { label: t('ui.payments.col_order'), get: (p) => p.order?.orderNumber ?? '' },
        { label: t('ui.payments.col_client'), get: (p) => p.order?.user?.name ?? '' },
        { label: t('ui.payments.col_method'), get: (p) => methodLabel(p.method) },
        { label: t('ui.payments.col_account'), get: (p) => p.paymentAccount?.name ?? '' },
        { label: t('ui.payments.col_amount'), get: (p) => fmtFCFA(p.amount) },
        { label: t('ui.payments.col_status'), get: (p) => statusLabel(p.status) },
        { label: t('ui.payments.col_date'), get: (p) => csvDate(p.paidAt ?? p.createdAt) },
      ],
      rows,
    );
    notify('ui.actions.export_done', { type: 'info', messageArgs: { n: rows.length } });
  };

  const received = data
    .filter((p) => p.status === 'COMPLETED')
    .reduce((s, p) => s + Number(p.amount), 0);
  const pending = data.filter((p) => p.status === 'PENDING');
  const pendingSum = pending.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <CelvaSkin>
      <Title title={t('ui.payments.title')} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="between" style={{ marginBottom: 18, alignItems: 'flex-start', gap: 14 }}>
          <div style={{ maxWidth: '52ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              {t('ui.payments.title')}
            </div>
            <div className="note">{t('ui.payments.intro')}</div>
          </div>
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v" style={{ color: 'var(--st-done)' }}>
              {fmtFCFA(received)}
            </div>
            <div className="ds-l">{t('ui.payments.summary_received')}</div>
          </div>
          <div className={`ds-item${pending.length ? ' warn' : ''}`}>
            <div className="ds-v">{fmtFCFA(pendingSum)}</div>
            <div className="ds-l">{t('ui.payments.summary_pending')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{pending.length}</div>
            <div className="ds-l">{t('ui.payments.summary_cash')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{data.length}</div>
            <div className="ds-l">{t('ui.payments.summary_total')}</div>
          </div>
        </div>

        <div className="tabs">
          {TABS.map((x) => (
            <button
              key={x.id}
              className={`tab${tab === x.id ? ' active' : ''}`}
              onClick={() => setTab(x.id)}
            >
              {t(`ui.payments.tab_${x.id}`)}
              <span className="tcount num">{data.filter(x.match).length}</span>
            </button>
          ))}
        </div>

        <div className="subfilters">
          <div className="search" style={{ minWidth: 220 }}>
            <SearchIcon />
            <input
              placeholder={t('ui.payments.search')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={exportCsv} disabled={rows.length === 0}>
            <DownloadIcon sx={{ fontSize: 16 }} />
            {t('ui.actions.export')}
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<PaymentsIcon sx={{ fontSize: 40 }} />}
              title={isLoading ? t('ui.payments.loading') : t('ui.payments.empty')}
            />
          </div>
        ) : (
          <div className="card pay-scroll">
            <table className="flow-table">
              <thead>
                <tr>
                  <th>{t('ui.payments.col_order')}</th>
                  <th>{t('ui.payments.col_client')}</th>
                  <th>{t('ui.payments.col_method')}</th>
                  <th>{t('ui.payments.col_account')}</th>
                  <th style={{ textAlign: 'right' }}>{t('ui.payments.col_amount')}</th>
                  <th>{t('ui.payments.col_status')}</th>
                  <th>{t('ui.payments.col_date')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => redirect('show', 'orders', p.orderId)}
                  >
                    <td className="num">{p.order?.orderNumber ?? '—'}</td>
                    <td>{p.order?.user?.name ?? '—'}</td>
                    <td>{methodLabel(p.method)}</td>
                    <td className="muted">{p.paymentAccount?.name ?? '—'}</td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      {fmtFCFA(p.amount)}
                    </td>
                    <td>
                      <span className={`pill ${STATUS_SC[p.status]}`}>
                        <span className="pdot" />
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="muted">{relativeFr(p.paidAt ?? p.createdAt, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
