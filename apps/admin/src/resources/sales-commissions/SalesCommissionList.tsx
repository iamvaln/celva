import './sales-commissions.css';
import { useMemo, useState } from 'react';
import { Title, useGetList, useNotify, useRefresh, useTranslate } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import PaidIcon from '@mui/icons-material/Paid';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA, relativeFr } from '../orders/orderSkin';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import type { SalesCommission } from '../../types';

type CommStatus = SalesCommission['status'];

/** Status → French label + design status-class (color binding in celva-skin.css). */
const STATUS_SKIN: Record<CommStatus, { label: string; sc: string }> = {
  PENDING: { label: 'En attente', sc: 's-todo' },
  PAID: { label: 'Payée', sc: 's-done' },
};

type Tab = { id: string; label: string; match: (c: SalesCommission) => boolean };

const TABS: Tab[] = [
  { id: 'PENDING', label: 'En attente', match: (c) => c.status === 'PENDING' },
  { id: 'PAID', label: 'Payées', match: (c) => c.status === 'PAID' },
  { id: 'all', label: 'Toutes', match: () => true },
];

const dateFr = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));

const productLabel = (c: SalesCommission): string =>
  c.orderItem?.variant?.product?.name?.fr ?? '—';

export const SalesCommissionList = () => {
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [tab, setTab] = useState<string>('PENDING');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const {
    data: commissions = [],
    isLoading,
  } = useGetList<SalesCommission>('sales-commissions', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'createdAt', order: 'DESC' },
  });

  // Summary computed client-side from loaded rows.
  const summary = useMemo(() => {
    let pendingTotal = 0;
    let pendingCount = 0;
    let paidTotal = 0;
    const reps = new Set<string>();
    for (const c of commissions) {
      reps.add(c.salesRepId);
      const amt = Number(c.amount);
      if (c.status === 'PENDING') {
        pendingTotal += amt;
        pendingCount += 1;
      } else {
        paidTotal += amt;
      }
    }
    return { pendingTotal, pendingCount, paidTotal, reps: reps.size };
  }, [commissions]);

  const rows = useMemo(() => {
    const tabDef = TABS.find((tt) => tt.id === tab) ?? TABS[0]!;
    let r = commissions.filter(tabDef.match);
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      r = r.filter(
        (c) =>
          (c.order?.orderNumber ?? '').toLowerCase().includes(qq) ||
          (c.salesRep?.name ?? '').toLowerCase().includes(qq) ||
          (c.salesRep?.email ?? '').toLowerCase().includes(qq) ||
          productLabel(c).toLowerCase().includes(qq),
      );
    }
    return r;
  }, [commissions, tab, q]);

  // Only PENDING rows in the current view are selectable for payment.
  const selectableIds = useMemo(
    () => rows.filter((c) => c.status === 'PENDING').map((c) => c.id),
    [rows],
  );
  const selectedIds = useMemo(
    () => selectableIds.filter((id) => selected.has(id)),
    [selectableIds, selected],
  );
  const allSelected =
    selectableIds.length > 0 && selectedIds.length === selectableIds.length;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) selectableIds.forEach((id) => next.delete(id));
      else selectableIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const markPaid = async () => {
    if (selectedIds.length === 0 || busy) return;
    try {
      setBusy(true);
      const { body } = await fetchJson<{ paid: number; totalAmount: string }>(
        `${API_BASE}/sales-commissions/mark-paid`,
        { method: 'POST', body: JSON.stringify({ ids: selectedIds }) },
      );
      notify(
        t('resources.sales-commissions.notifications.paid', {
          n: body.paid,
          total: fmtFCFA(body.totalAmount),
        }),
        { type: 'success' },
      );
      setSelected(new Set());
      refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), {
        type: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <CelvaSkin>
      <Title title={t('resources.sales-commissions.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="toolbar">
          <div style={{ maxWidth: '46ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              Commissions commerciales
            </div>
            <div className="note">
              Calculées automatiquement sur les ventes des commerciaux — commandes
              directes et consignations.
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="search">
            <SearchIcon />
            <input
              placeholder="Rechercher (commande, commercial, produit)…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {selectedIds.length > 0 && (
            <button className="btn btn-primary" onClick={markPaid} disabled={busy}>
              <PaidIcon sx={{ fontSize: 16 }} />
              {t('resources.sales-commissions.actions.mark_paid')} ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v" style={{ color: 'var(--st-urgent)' }}>
              {fmtFCFA(summary.pendingTotal)}
            </div>
            <div className="ds-l">
              À payer · {summary.pendingCount} en attente
            </div>
          </div>
          <div className="ds-item">
            <div className="ds-v" style={{ color: 'var(--st-done)' }}>
              {fmtFCFA(summary.paidTotal)}
            </div>
            <div className="ds-l">Payé</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{summary.reps}</div>
            <div className="ds-l">Commerciaux</div>
          </div>
        </div>

        <div className="tabs">
          {TABS.map((tt) => {
            const count = commissions.filter(tt.match).length;
            return (
              <button
                key={tt.id}
                className={`tab${tt.id === tab ? ' active' : ''}`}
                onClick={() => setTab(tt.id)}
              >
                {tt.label}
                <span className="tcount num">{count}</span>
              </button>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<PaidIcon sx={{ fontSize: 40 }} />}
              title={
                isLoading
                  ? t('ra.page.loading')
                  : 'Aucune commission dans cette vue'
              }
              sub={
                isLoading || q.trim() || tab !== 'all'
                  ? undefined
                  : 'Les commissions apparaissent dès qu’un commercial enregistre une vente.'
              }
            />
          </div>
        ) : (
          <div className="card flow-scroll">
            <table className="flow-table">
              <thead>
                <tr>
                  {selectableIds.length > 0 && (
                    <th className="cm-sel">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Tout sélectionner"
                      />
                    </th>
                  )}
                  <th>{t('resources.sales-commissions.fields.orderNumber')}</th>
                  <th>{t('resources.sales-commissions.fields.salesRep')}</th>
                  <th>{t('resources.sales-commissions.fields.product')}</th>
                  <th style={{ textAlign: 'right' }}>
                    {t('resources.sales-commissions.fields.amount')}
                  </th>
                  <th>{t('resources.sales-commissions.fields.status')}</th>
                  <th>{t('resources.sales-commissions.fields.paidAt')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const meta = STATUS_SKIN[c.status];
                  const isPending = c.status === 'PENDING';
                  const isSel = selected.has(c.id);
                  return (
                    <tr key={c.id} className={isSel ? 'cm-selected' : undefined}>
                      {selectableIds.length > 0 && (
                        <td className="cm-sel">
                          {isPending && (
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={() => toggleOne(c.id)}
                              aria-label={`Sélectionner ${c.order?.orderNumber ?? ''}`}
                            />
                          )}
                        </td>
                      )}
                      <td className="cm-order">{c.order?.orderNumber ?? '—'}</td>
                      <td>
                        <span className="cm-rep">{c.salesRep?.name ?? '—'}</span>
                        {c.salesRep?.email && (
                          <span className="cm-rep-mail">{c.salesRep.email}</span>
                        )}
                      </td>
                      <td>
                        <span className="cm-prod">{productLabel(c)}</span>
                        {c.orderItem?.quantity != null && (
                          <span className="cm-qty"> × {c.orderItem.quantity}</span>
                        )}
                      </td>
                      <td className="cm-amt" style={{ textAlign: 'right' }}>
                        {fmtFCFA(c.amount)}
                      </td>
                      <td>
                        <span className={`pill ${meta.sc}`}>
                          <span className="pdot" />
                          {meta.label}
                        </span>
                      </td>
                      <td className={`cm-when${isPending ? ' unpaid' : ''}`}>
                        {c.paidAt ? (
                          <>
                            {dateFr(c.paidAt)}
                            <span style={{ display: 'block', fontSize: 12 }}>
                              {relativeFr(c.paidAt)}
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
