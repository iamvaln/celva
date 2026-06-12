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

/** French label + status hue for each transaction category. INCOME
 *  categories lean «done» (green), EXPENSE categories «urgent/neutral». */
const CATEGORY_META: Record<TxCategory, { label: string; sc: string }> = {
  SALE: { label: 'Vente', sc: 's-done' },
  COMMISSION: { label: 'Commission', sc: 's-urgent' },
  RAW_MATERIALS: { label: 'Matières premières', sc: 's-urgent' },
  SUBCONTRACTING: { label: 'Sous-traitance', sc: 's-urgent' },
  MARKETING: { label: 'Marketing', sc: 's-todo' },
  TRANSPORT: { label: 'Transport', sc: 's-todo' },
  CUSTOMS: { label: 'Douane', sc: 's-todo' },
  SALARY: { label: 'Salaires', sc: 's-info' },
  RENT: { label: 'Loyer', sc: 's-info' },
  EQUIPMENT: { label: 'Équipement', sc: 's-info' },
  PACKAGING: { label: 'Emballage', sc: 's-neutral' },
  DELIVERY: { label: 'Livraison', sc: 's-neutral' },
  OTHER: { label: 'Autre', sc: 's-neutral' },
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
          (CATEGORY_META[x.category]?.label ?? '').toLowerCase().includes(qq) ||
          (x.order?.orderNumber ?? '').toLowerCase().includes(qq),
      );
    }
    return r;
  }, [transactions, nature, category, q]);

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
              Journal · toutes les entrées et sorties
            </div>
            <div className="note">
              Alimenté par les ventes, achats et commissions. La saisie manuelle
              couvre les dépenses non capturées ailleurs.
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="search">
            <SearchIcon />
            <input
              placeholder="Rechercher un libellé…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => redirect('create', 'transactions')}
          >
            <AddIcon sx={{ fontSize: 18 }} />
            Transaction
          </button>
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v" style={{ color: 'var(--st-done)' }}>
              {fmtFCFA(recettes)}
            </div>
            <div className="ds-l">Recettes</div>
          </div>
          <div className="ds-item">
            <div className="ds-v" style={{ color: 'var(--st-urgent)' }}>
              {fmtFCFA(depenses)}
            </div>
            <div className="ds-l">Dépenses</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{fmtFCFA(net)}</div>
            <div className="ds-l">Net</div>
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
            Toutes
          </button>
          <button
            className={`chip${nature === 'INCOME' ? ' on' : ''}`}
            onClick={() => setNature('INCOME')}
          >
            Recettes
          </button>
          <button
            className={`chip${nature === 'EXPENSE' ? ' on' : ''}`}
            onClick={() => setNature('EXPENSE')}
          >
            Dépenses
          </button>
          {presentCategories.length > 0 && (
            <>
              <div style={{ flex: 1 }} />
              <button
                className={`chip${category === 'all' ? ' on' : ''}`}
                onClick={() => setCategory('all')}
              >
                Toutes catégories
              </button>
              {presentCategories.map((c) => (
                <button
                  key={c}
                  className={`chip${category === c ? ' on' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {CATEGORY_META[c].label}
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
                isLoading ? t('ra.page.loading') : 'Aucune transaction pour ce filtre'
              }
              sub={
                isLoading
                  ? undefined
                  : 'Ajustez la nature, la catégorie ou la recherche pour voir davantage de mouvements.'
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
                          {meta?.label ?? x.category}
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
              Charger plus
            </button>
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
