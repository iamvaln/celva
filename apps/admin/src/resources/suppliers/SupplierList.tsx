import './suppliers.css';
import { useMemo, useState } from 'react';
import { Title, useGetList, useRedirect, useTranslate } from 'react-admin';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import FactoryIcon from '@mui/icons-material/Factory';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA } from '../orders/orderSkin';

/**
 * Supplier list row as returned by the admin API. The list endpoint
 * enriches each record with read-only aggregates (purchase-order count,
 * raw-material count, total spent). Defined locally — types.ts is shared
 * and off-limits for this module.
 */
type SupplierRow = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  purchaseOrderCount?: number;
  materialCount?: number;
  totalSpent?: number;
};

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';

export const SupplierList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const { data, isLoading } = useGetList<SupplierRow>('suppliers', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'name', order: 'ASC' },
  });

  const [q, setQ] = useState('');

  const suppliers = useMemo(() => data ?? [], [data]);

  const rows = useMemo(() => {
    if (!q.trim()) return suppliers;
    const qq = q.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(qq) ||
        (s.contact ?? '').toLowerCase().includes(qq) ||
        (s.email ?? '').toLowerCase().includes(qq),
    );
  }, [suppliers, q]);

  const totalOrders = suppliers.reduce((sum, s) => sum + (s.purchaseOrderCount ?? 0), 0);
  const totalSpent = suppliers.reduce((sum, s) => sum + (s.totalSpent ?? 0), 0);
  const totalMaterials = suppliers.reduce((sum, s) => sum + (s.materialCount ?? 0), 0);

  return (
    <CelvaSkin>
      <Title title={t('resources.suppliers.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="toolbar">
          <div className="search">
            <SearchIcon />
            <input
              placeholder={t('resources.suppliers.search')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => redirect('create', 'suppliers')}>
            <AddIcon sx={{ fontSize: 16 }} /> {t('resources.suppliers.add')}
          </button>
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v">{suppliers.length}</div>
            <div className="ds-l">{t('resources.suppliers.summary.suppliers')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{totalOrders}</div>
            <div className="ds-l">{t('resources.suppliers.summary.orders')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{fmtFCFA(totalSpent)}</div>
            <div className="ds-l">{t('resources.suppliers.summary.spent')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{totalMaterials}</div>
            <div className="ds-l">{t('resources.suppliers.summary.materials')}</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<FactoryIcon sx={{ fontSize: 40 }} />}
              title={
                isLoading
                  ? t('ra.page.loading')
                  : q.trim()
                    ? t('resources.suppliers.no_match')
                    : t('resources.suppliers.empty')
              }
              actionLabel={!isLoading && !q.trim() ? t('resources.suppliers.add') : undefined}
              onAction={
                !isLoading && !q.trim() ? () => redirect('create', 'suppliers') : undefined
              }
            />
          </div>
        ) : (
          <div className="list-wrap">
            {rows.map((s) => (
              <div
                key={s.id}
                className="lrow sup"
                onClick={() => redirect('edit', 'suppliers', s.id)}
              >
                <div className="savatar">{initials(s.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="lname">{s.name}</div>
                  <div className="lsub">
                    <span className="row" style={{ gap: 5 }}>
                      <PersonOutlineIcon sx={{ fontSize: 13 }} />
                      {s.contact || t('resources.suppliers.no_contact')}
                    </span>
                    {(s.phone || s.email) && <span>·</span>}
                    {s.phone ? <span>{s.phone}</span> : s.email ? <span>{s.email}</span> : null}
                  </div>
                </div>
                <div className="lcell">
                  <div className="lc-v">{s.purchaseOrderCount ?? 0}</div>
                  <div className="lc-l">{t('resources.suppliers.summary.orders')}</div>
                </div>
                <div className="lcell">
                  <div className="lc-v">{fmtFCFA(s.totalSpent ?? 0)}</div>
                  <div className="lc-l">{t('resources.suppliers.summary.spent')}</div>
                </div>
                <div className="lchev">
                  <ChevronRightIcon sx={{ fontSize: 18 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
