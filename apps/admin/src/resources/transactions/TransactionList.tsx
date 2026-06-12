import './transactions.css';
import { useMemo, useState } from 'react';
import {
  Title,
  useGetList,
  useRedirect,
  useTranslate,
} from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA, relativeFr } from '../orders/orderSkin';
import type { Transaction } from '../../types';

type TxCategory = Transaction['category'];

/** Translation key + status hue for each transaction category. INCOME
 *  categories lean «done» (green), EXPENSE categories «urgent/neutral». */
const CATEGORY_META: Record<TxCategory, { key: string; sc: string }> = {
  SALE: { key: 'cat_sale', sc: 's-done' },
  COMMISSION: { key: 'cat_commission', sc: 's-urgent' },
  RAW_MATERIALS: { key: 'cat_raw_materials', sc: 's-urgent' },
  SUBCONTRACTING: { key: 'cat_subcontracting', sc: 's-urgent' },
  MARKETING: { key: 'cat_marketing', sc: 's-todo' },
  TRANSPORT: { key: 'cat_transport', sc: 's-todo' },
  CUSTOMS: { key: 'cat_customs', sc: 's-todo' },
  SALARY: { key: 'cat_salary', sc: 's-info' },
  RENT: { key: 'cat_rent', sc: 's-info' },
  EQUIPMENT: { key: 'cat_equipment', sc: 's-info' },
  PACKAGING: { key: 'cat_packaging', sc: 's-neutral' },
  DELIVERY: { key: 'cat_delivery', sc: 's-neutral' },
  OTHER: { key: 'cat_other', sc: 's-neutral' },
};

const fmtDate = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

type Nature = 'all' | 'INCOME' | 'EXPENSE';

export const TransactionList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const [perPage, setPerPage] = useState(50);
  const [nature, setNature] = useState<Nature>('all');
  const [category, setCategory] = useState<'all' | TxCategory>('all');
  const [q, setQ] = useState('');

  const {
    data: transactions = [],
    total = 0,
    isLoading,
  } = useGetList<Transaction>('transactions', {
    pagination: { page: 1, perPage },
    sort: { field: 'date', order: 'DESC' },
  });

  const rows = useMemo(() => {
    let r = transactions;
    if (nature !== 'all') r = r.filter((x) => x.type === nature);
    if (category !== 'all') r = r.filter((x) => x.category === category);
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      r = r.filter(
        (x) =>
          (x.description ?? '').toLowerCase().includes(qq) ||
          (CATEGORY_META[x.category]
            ? t('ui.transactions.' + CATEGORY_META[x.category].key)
            : x.category
          )
            .toLowerCase()
            .includes(qq) ||
          (x.order?.orderNumber ?? '').toLowerCase().includes(qq),
      );
    }
    return r;
  }, [transactions, nature, category, q, t]);

  /* Aggregates over the loaded rows (recettes / dépenses / net). */
  const { recettes, depenses } = useMemo(() => {
    let recettes = 0;
    let depenses = 0;
    for (const x of transactions) {
      const amt = Number(x.amount);
      if (x.type === 'INCOME') recettes += amt;
      else depenses += amt;
    }
    return { recettes, depenses };
  }, [transactions]);
  const net = recettes - depenses;

  /* Categories actually present, so the filter row stays relevant. */
  const presentCategories = useMemo(() => {
    const seen = new Set<TxCategory>();
    for (const x of transactions) seen.add(x.category);
    return (Object.keys(CATEGORY_META) as TxCategory[]).filter((c) =>
      seen.has(c),
    );
  }, [transactions]);

  return (
    <CelvaSkin>
      <Title title={t('resources.transactions.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="toolbar">
          <div style={{ maxWidth: '46ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              {t('ui.transactions.heading')}
            </div>
            <div className="note">
              {t('ui.transactions.subtitle')}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="search">
            <SearchIcon />
            <input
              placeholder={t('ui.transactions.search_placeholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => redirect('create', 'transactions')}
          >
            <AddIcon sx={{ fontSize: 18 }} />
            {t('ui.transactions.add')}
          </button>
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v" style={{ color: 'var(--st-done)' }}>
              {fmtFCFA(recettes)}
            </div>
            <div className="ds-l">{t('ui.transactions.summary_income')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v" style={{ color: 'var(--st-urgent)' }}>
              {fmtFCFA(depenses)}
            </div>
            <div className="ds-l">{t('ui.transactions.summary_expense')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{fmtFCFA(net)}</div>
            <div className="ds-l">{t('ui.transactions.summary_net')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{total}</div>
            <div className="ds-l">{t('resources.transactions.name', { smart_count: 2 })}</div>
          </div>
        </div>

        <div className="subfilters">
          <button
            className={`chip${nature === 'all' ? ' on' : ''}`}
            onClick={() => setNature('all')}
          >
            {t('ui.transactions.nature_all')}
          </button>
          <button
            className={`chip${nature === 'INCOME' ? ' on' : ''}`}
            onClick={() => setNature('INCOME')}
          >
            {t('ui.transactions.nature_income')}
          </button>
          <button
            className={`chip${nature === 'EXPENSE' ? ' on' : ''}`}
            onClick={() => setNature('EXPENSE')}
          >
            {t('ui.transactions.nature_expense')}
          </button>
          {presentCategories.length > 0 && (
            <>
              <div style={{ flex: 1 }} />
              <button
                className={`chip${category === 'all' ? ' on' : ''}`}
                onClick={() => setCategory('all')}
              >
                {t('ui.transactions.cat_all')}
              </button>
              {presentCategories.map((c) => (
                <button
                  key={c}
                  className={`chip${category === c ? ' on' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {t('ui.transactions.' + CATEGORY_META[c].key)}
                </button>
              ))}
            </>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<AccountBalanceWalletIcon sx={{ fontSize: 40 }} />}
              title={
                isLoading
                  ? t('ra.page.loading')
                  : t('ui.transactions.empty_title')
              }
              sub={
                isLoading ? undefined : t('ui.transactions.empty_sub')
              }
            />
          </div>
        ) : (
          <div className="card flow-scroll">
            <table className="flow-table">
              <thead>
                <tr>
                  <th>{t('resources.transactions.fields.date')}</th>
                  <th>{t('resources.transactions.fields.category')}</th>
                  <th>{t('resources.transactions.fields.description')}</th>
                  <th>{t('resources.transactions.fields.source')}</th>
                  <th style={{ textAlign: 'right' }}>
                    {t('resources.transactions.fields.amount')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => {
                  const meta = CATEGORY_META[x.category];
                  const isIn = x.type === 'INCOME';
                  return (
                    <tr key={x.id}>
                      <td className="tx-when">
                        {fmtDate(x.date)}
                        <span className="tx-ago">{relativeFr(x.date)}</span>
                      </td>
                      <td>
                        <span className={`pill ${meta?.sc ?? 's-neutral'}`}>
                          <span className="pdot" />
                          {meta ? t('ui.transactions.' + meta.key) : x.category}
                        </span>
                      </td>
                      <td className={`tx-desc${x.description ? '' : ' muted'}`}>
                        {x.description || '—'}
                      </td>
                      <td className="tx-src">
                        {x.order?.orderNumber ? (
                          <span className="tx-tag order">
                            {t('resources.transactions.source.order', {
                              number: x.order.orderNumber,
                            })}
                          </span>
                        ) : (
                          <span className="tx-tag">
                            {t('resources.transactions.source.manual')}
                          </span>
                        )}
                      </td>
                      <td
                        className={isIn ? 'amt-in' : 'amt-out'}
                        style={{ textAlign: 'right' }}
                      >
                        {isIn ? '+ ' : '− '}
                        {fmtFCFA(x.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && transactions.length < total && (
          <div className="load-more">
            <button
              className="btn btn-ghost"
              onClick={() => setPerPage((p) => p + 50)}
            >
              {t('ui.transactions.load_more')}
            </button>
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
