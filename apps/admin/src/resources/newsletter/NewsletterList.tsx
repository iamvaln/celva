import './newsletter.css';
import { useMemo, useState } from 'react';
import { Title, useGetList, useNotify, useRefresh, useTranslate } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { relativeFr } from '../orders/orderSkin';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import type { NewsletterSubscriber } from '../../types';

type StatusFilter = 'all' | 'active' | 'inactive';

const fmtDate = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));

export const NewsletterList = () => {
  const t = useTranslate();
  const notify = useNotify();
  const refresh = useRefresh();

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const {
    data: subscribers = [],
    total = 0,
    isLoading,
  } = useGetList<NewsletterSubscriber>('newsletter', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'subscribedAt', order: 'DESC' },
  });

  const activeCount = subscribers.filter((s) => s.isActive).length;
  const unsubCount = subscribers.length - activeCount;

  const rows = useMemo(() => {
    let r = subscribers;
    if (filter === 'active') r = r.filter((s) => s.isActive);
    if (filter === 'inactive') r = r.filter((s) => !s.isActive);
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      r = r.filter(
        (s) =>
          s.email.toLowerCase().includes(qq) ||
          (s.name ?? '').toLowerCase().includes(qq),
      );
    }
    return r;
  }, [subscribers, filter, q]);

  // Selection only applies to still-active subscribers (others can't be unsubscribed).
  const selectableIds = rows.filter((s) => s.isActive).map((s) => s.id);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        selectableIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...selectableIds]);
    });

  // Bulk unsubscribe — preserved from the original screen, fans out to the
  // existing POST /newsletter/admin/:id/unsubscribe endpoint per subscriber.
  const bulkUnsubscribe = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    try {
      setBusy(true);
      await Promise.all(
        ids.map((id) =>
          fetchJson(`${API_BASE}/newsletter/admin/${id}/unsubscribe`, {
            method: 'POST',
          }),
        ),
      );
      notify(
        `${ids.length} abonné${ids.length > 1 ? 's' : ''} désabonné${ids.length > 1 ? 's' : ''}`,
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

  const selCount = selected.size;

  return (
    <CelvaSkin>
      <Title title={t('resources.newsletter.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="toolbar">
          <div style={{ maxWidth: '46ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              Abonnés à la newsletter
            </div>
            <div className="note">
              Celva gère la collecte et l’export de la liste. Les envois, le tracking
              et la conformité se font dans Brevo.
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="search">
            <SearchIcon />
            <input
              placeholder="Rechercher un email ou un nom…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* Brevo handoff banner — informational */}
        <div className="brevo-banner">
          <div className="bb-ic">
            <NotificationsActiveIcon sx={{ fontSize: 18 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="bb-t">La gestion des campagnes se fait dans Brevo</div>
            <div className="bb-s">
              Cette liste reflète les abonnés collectés sur le site. La composition,
              l’envoi, le tracking et la conformité des campagnes se font dans Brevo.
            </div>
          </div>
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v">{total}</div>
            <div className="ds-l">Total abonnés</div>
          </div>
          <div className="ds-item">
            <div className="ds-v" style={{ color: 'var(--st-done)' }}>
              {activeCount}
            </div>
            <div className="ds-l">Actifs</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{unsubCount}</div>
            <div className="ds-l">Désabonnés</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{rows.length}</div>
            <div className="ds-l">Affichés</div>
          </div>
        </div>

        <div className="subfilters">
          <button
            className={`chip${filter === 'all' ? ' on' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tous
          </button>
          <button
            className={`chip${filter === 'active' ? ' on' : ''}`}
            onClick={() => setFilter('active')}
          >
            Abonnés actifs
          </button>
          <button
            className={`chip${filter === 'inactive' ? ' on' : ''}`}
            onClick={() => setFilter('inactive')}
          >
            Désabonnés
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<MarkEmailReadIcon sx={{ fontSize: 40 }} />}
              title={isLoading ? t('ra.page.loading') : 'Aucun abonné'}
              sub={
                isLoading
                  ? undefined
                  : 'Aucun abonné ne correspond à ce filtre ou à cette recherche.'
              }
            />
          </div>
        ) : (
          <div className="card sub-scroll">
            <table className="flow-table sub-table">
              <thead>
                <tr>
                  <th className="sel-col">
                    {selectableIds.length > 0 && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Tout sélectionner"
                      />
                    )}
                  </th>
                  <th>Email</th>
                  <th>Nom</th>
                  <th>Statut</th>
                  <th>Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className={selected.has(s.id) ? 'row-selected' : ''}>
                    <td className="sel-col">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        disabled={!s.isActive}
                        onChange={() => toggleOne(s.id)}
                        aria-label={`Sélectionner ${s.email}`}
                      />
                    </td>
                    <td>
                      <span className="sub-email">{s.email}</span>
                    </td>
                    <td className={s.name ? '' : 'sub-name muted'}>{s.name || '—'}</td>
                    <td>
                      <span className={`pill ${s.isActive ? 's-done' : 's-neutral'}`}>
                        <span className="pdot" />
                        {s.isActive ? 'Actif' : 'Désabonné'}
                      </span>
                    </td>
                    <td className="sub-when">
                      {fmtDate(s.subscribedAt)}
                      <span className="sub-ago">{relativeFr(s.subscribedAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selCount > 0 && (
          <div className="sub-bulkbar">
            <span className="sb-count">
              {selCount} abonné{selCount > 1 ? 's' : ''} sélectionné
              {selCount > 1 ? 's' : ''}
            </span>
            <div className="sb-spacer" />
            <button
              className="btn btn-quiet"
              onClick={() => setSelected(new Set())}
              disabled={busy}
            >
              Annuler
            </button>
            <button className="btn btn-danger" onClick={bulkUnsubscribe} disabled={busy}>
              Désabonner
            </button>
          </div>
        )}

        <div className="note" style={{ marginTop: 12, fontStyle: 'italic' }}>
          Les désabonnés sont conservés en inactif (RGPD). Le formulaire de collecte
          (footer du site) précède l’activation par un email de confirmation (double
          opt-in).
        </div>
      </div>
    </CelvaSkin>
  );
};
