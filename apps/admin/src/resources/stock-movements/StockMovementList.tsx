import './stock-movements.css';
import { useMemo, useState } from 'react';
import { Title, useGetList, useTranslate } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { relativeFr } from '../orders/orderSkin';
import type { StockMovement } from '../../types';

type MovementType = StockMovement['type'];

/** Translation key + status hue for each movement type. */
const TYPE_META: Record<MovementType, { labelKey: string; sc: string }> = {
  PRODUCTION_IN: { labelKey: 'ui.stock-movements.production_in', sc: 's-done' },
  PURCHASE_IN: { labelKey: 'ui.stock-movements.purchase_in', sc: 's-info' },
  CANCELLATION_RETURN: { labelKey: 'ui.stock-movements.cancellation_return', sc: 's-info' },
  CONSIGNMENT_RETURN: { labelKey: 'ui.stock-movements.consignment_return', sc: 's-info' },
  SALE_OUT: { labelKey: 'ui.stock-movements.sale_out', sc: 's-urgent' },
  CONSIGNMENT_OUT: { labelKey: 'ui.stock-movements.consignment_out', sc: 's-todo' },
  MANUAL_ADJUSTMENT: { labelKey: 'ui.stock-movements.manual_adjustment', sc: 's-neutral' },
};

const TYPE_ORDER: MovementType[] = [
  'PRODUCTION_IN',
  'PURCHASE_IN',
  'SALE_OUT',
  'CONSIGNMENT_OUT',
  'CONSIGNMENT_RETURN',
  'CANCELLATION_RETURN',
  'MANUAL_ADJUSTMENT',
];

const fmtDate = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

export const StockMovementList = () => {
  const t = useTranslate();
  const [perPage, setPerPage] = useState(50);
  const [type, setType] = useState<'all' | MovementType>('all');
  const [q, setQ] = useState('');

  const {
    data: movements = [],
    total = 0,
    isLoading,
  } = useGetList<StockMovement>('stock-movements', {
    pagination: { page: 1, perPage },
    sort: { field: 'createdAt', order: 'DESC' },
  });

  const rows = useMemo(() => {
    let r = movements;
    if (type !== 'all') r = r.filter((m) => m.type === type);
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      r = r.filter(
        (m) =>
          (m.variant?.sku ?? '').toLowerCase().includes(qq) ||
          (m.variant?.product?.name?.fr ?? '').toLowerCase().includes(qq) ||
          (m.reason ?? '').toLowerCase().includes(qq),
      );
    }
    return r;
  }, [movements, type, q]);

  const insN = movements.filter((m) => m.quantity > 0).length;
  const outsN = movements.filter((m) => m.quantity < 0).length;

  return (
    <CelvaSkin>
      <Title title={t('resources.stock-movements.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="toolbar">
          <div style={{ maxWidth: '46ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              {t('resources.stock-movements.eyebrow')}
            </div>
            <div className="note">{t('resources.stock-movements.intro')}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="search">
            <SearchIcon />
            <input
              placeholder={t('resources.stock-movements.search')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v">{total}</div>
            <div className="ds-l">{t('resources.stock-movements.name', { smart_count: 2 })}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v" style={{ color: 'var(--st-done)' }}>
              {insN}
            </div>
            <div className="ds-l">{t('resources.stock-movements.summary.in')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v" style={{ color: 'var(--st-urgent)' }}>
              {outsN}
            </div>
            <div className="ds-l">{t('resources.stock-movements.summary.out')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{rows.length}</div>
            <div className="ds-l">{t('resources.stock-movements.summary.shown')}</div>
          </div>
        </div>

        <div className="subfilters">
          <button
            className={`chip${type === 'all' ? ' on' : ''}`}
            onClick={() => setType('all')}
          >
            {t('resources.stock-movements.filters.all')}
          </button>
          {TYPE_ORDER.map((tp) => (
            <button
              key={tp}
              className={`chip${type === tp ? ' on' : ''}`}
              onClick={() => setType(tp)}
            >
              {t(TYPE_META[tp].labelKey)}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<SwapVertIcon sx={{ fontSize: 40 }} />}
              title={
                isLoading
                  ? t('ra.page.loading')
                  : t('resources.stock-movements.empty')
              }
              sub={
                isLoading ? undefined : t('resources.stock-movements.empty_sub')
              }
            />
          </div>
        ) : (
          <div className="card flow-scroll">
            <table className="flow-table">
              <thead>
                <tr>
                  <th>{t('resources.stock-movements.fields.createdAt')}</th>
                  <th>{t('resources.stock-movements.fields.type')}</th>
                  <th>{t('resources.stock-movements.fields.product')}</th>
                  <th style={{ textAlign: 'right' }}>
                    {t('resources.stock-movements.fields.quantity')}
                  </th>
                  <th>{t('resources.stock-movements.fields.reason')}</th>
                  <th>{t('resources.stock-movements.fields.actor')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const meta = TYPE_META[m.type];
                  const isIn = m.quantity > 0;
                  return (
                    <tr key={m.id}>
                      <td className="sm-when">
                        {fmtDate(m.createdAt)}
                        <span className="sm-ago">{relativeFr(m.createdAt, t)}</span>
                      </td>
                      <td>
                        <span className={`pill ${meta.sc}`}>
                          <span className="pdot" />
                          {t(meta.labelKey)}
                        </span>
                      </td>
                      <td>
                        <span className="sm-prod">
                          {m.variant?.product?.name?.fr ?? '—'}
                        </span>
                        {m.variant?.sku && (
                          <span className="sm-sku">{m.variant.sku}</span>
                        )}
                      </td>
                      <td
                        className={isIn ? 'amt-in' : 'amt-out'}
                        style={{ textAlign: 'right' }}
                      >
                        {isIn ? '+ ' : '− '}
                        {Math.abs(m.quantity)}
                      </td>
                      <td className="sm-reason">{m.reason || '—'}</td>
                      <td className="sm-actor">
                        {m.createdBy?.name || m.createdBy?.email || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && movements.length < total && (
          <div className="load-more">
            <button
              className="btn btn-ghost"
              onClick={() => setPerPage((p) => p + 50)}
            >
              {t('resources.stock-movements.load_more')}
            </button>
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
