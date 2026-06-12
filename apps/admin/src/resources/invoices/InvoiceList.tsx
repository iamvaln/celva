import { useMemo, useState } from 'react';
import { Title, useGetList, useNotify, useTranslate } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import type { AdminInvoice } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA, relativeFr } from '../orders/orderSkin';
import { API_BASE, STORAGE_KEYS } from '../../config';
import './invoices.css';

type Filter = 'all' | 'sent' | 'unsent';

export const InvoiceList = () => {
  const t = useTranslate();
  const notify = useNotify();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useGetList<AdminInvoice>('invoices', {
    pagination: { page: 1, perPage: 200 },
    sort: { field: 'createdAt', order: 'DESC' },
  });

  const rows = useMemo(() => {
    let r = data;
    if (filter === 'sent') r = r.filter((iv) => iv.sentAt);
    if (filter === 'unsent') r = r.filter((iv) => !iv.sentAt);
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter(
        (iv) =>
          iv.invoiceNumber.toLowerCase().includes(qq) ||
          (iv.order?.orderNumber ?? '').toLowerCase().includes(qq) ||
          (iv.order?.user?.name ?? '').toLowerCase().includes(qq),
      );
    }
    return r;
  }, [data, filter, q]);

  const totalTTC = data.reduce((s, iv) => s + Number(iv.totalTTC), 0);
  const totalTVA = data.reduce((s, iv) => s + Number(iv.totalTVA), 0);
  const unsent = data.filter((iv) => !iv.sentAt).length;

  const download = async (iv: AdminInvoice) => {
    try {
      const token = window.localStorage.getItem(STORAGE_KEYS.accessToken);
      const res = await fetch(`${API_BASE}/orders/${iv.orderId}/invoice`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      if (!res.ok) {
        notify('ui.invoices.download_failed', { type: 'error' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${iv.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      notify('ra.notification.http_error', { type: 'error' });
    }
  };

  return (
    <CelvaSkin>
      <Title title={t('ui.invoices.title')} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="between" style={{ marginBottom: 18, alignItems: 'flex-start', gap: 14 }}>
          <div style={{ maxWidth: '52ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              {t('ui.invoices.title')}
            </div>
            <div className="note">{t('ui.invoices.intro')}</div>
          </div>
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v">{fmtFCFA(totalTTC)}</div>
            <div className="ds-l">{t('ui.invoices.summary_ttc')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{fmtFCFA(totalTVA)}</div>
            <div className="ds-l">{t('ui.invoices.summary_vat')}</div>
          </div>
          <div className={`ds-item${unsent ? ' warn' : ''}`}>
            <div className="ds-v">{unsent}</div>
            <div className="ds-l">{t('ui.invoices.summary_unsent')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{data.length}</div>
            <div className="ds-l">{t('ui.invoices.summary_total')}</div>
          </div>
        </div>

        <div className="subfilters">
          {(['all', 'sent', 'unsent'] as Filter[]).map((id) => (
            <button
              key={id}
              className={`chip${filter === id ? ' on' : ''}`}
              onClick={() => setFilter(id)}
            >
              {t(`ui.invoices.filter_${id}`)}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div className="search" style={{ minWidth: 220 }}>
            <SearchIcon />
            <input
              placeholder={t('ui.invoices.search')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<ReceiptLongIcon sx={{ fontSize: 40 }} />}
              title={isLoading ? t('ui.invoices.loading') : t('ui.invoices.empty')}
            />
          </div>
        ) : (
          <div className="card inv-scroll">
            <table className="flow-table">
              <thead>
                <tr>
                  <th>{t('ui.invoices.col_number')}</th>
                  <th>{t('ui.invoices.col_order')}</th>
                  <th>{t('ui.invoices.col_client')}</th>
                  <th>{t('ui.invoices.col_date')}</th>
                  <th style={{ textAlign: 'right' }}>{t('ui.invoices.col_ttc')}</th>
                  <th style={{ textAlign: 'right' }}>{t('ui.invoices.col_vat')}</th>
                  <th>{t('ui.invoices.col_status')}</th>
                  <th style={{ textAlign: 'right' }}>{t('ui.invoices.col_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((iv) => (
                  <tr key={iv.id}>
                    <td className="num">{iv.invoiceNumber}</td>
                    <td className="num">{iv.order?.orderNumber ?? '—'}</td>
                    <td>{iv.order?.user?.name ?? '—'}</td>
                    <td className="muted">{relativeFr(iv.createdAt, t)}</td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      {fmtFCFA(iv.totalTTC)}
                    </td>
                    <td className="num muted" style={{ textAlign: 'right' }}>
                      {fmtFCFA(iv.totalTVA)}
                    </td>
                    <td>
                      <span className={`pill ${iv.sentAt ? 's-done' : 's-neutral'}`}>
                        <span className="pdot" />
                        {iv.sentAt ? t('ui.invoices.sent') : t('ui.invoices.unsent')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-quiet" onClick={() => void download(iv)}>
                        <DownloadIcon sx={{ fontSize: 15 }} /> {t('ui.invoices.pdf')}
                      </button>
                    </td>
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
