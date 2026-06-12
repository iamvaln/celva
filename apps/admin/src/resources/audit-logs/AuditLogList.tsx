import './audit-logs.css';
import { useMemo, useState } from 'react';
import { Title, useGetList, useTranslate } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { relativeFr } from '../orders/orderSkin';
import type { AuditLog } from '../../types';

/** Action → French label + status hue (the design's action-type legend).
 *  CREATE→s-done, UPDATE→s-info, DELETE→s-urgent (per spec). */
const ACTION_META: Record<string, { label: string; sc: string }> = {
  CREATE: { label: 'Création', sc: 's-done' },
  UPDATE: { label: 'Modification', sc: 's-info' },
  DELETE: { label: 'Suppression', sc: 's-urgent' },
  STATUS_CHANGE: { label: 'Changement de statut', sc: 's-todo' },
  LOGIN: { label: 'Connexion', sc: 's-neutral' },
  PAY: { label: 'Paiement', sc: 's-todo' },
};

/** Common actions shown as filter chips, in legend order. */
const ACTION_ORDER = ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN', 'PAY'];

/** Fallback meta for any action not in the map (keeps the journal exhaustive). */
const metaFor = (action: string): { label: string; sc: string } =>
  ACTION_META[action] ?? { label: action, sc: 's-neutral' };

/** appSource → French label. */
const SOURCE_LABEL: Record<string, string> = {
  WEB_STORE: 'Boutique web',
  WEB_ADMIN: 'Back-office',
  WEB_DELIVERY: 'Livraison web',
  MOBILE_STORE: 'Mobile boutique',
  MOBILE_STUDIO: 'Mobile atelier',
  MOBILE_DELIVERY: 'Mobile livraison',
  MOBILE_RESELLER: 'Mobile revendeur',
  API: 'API',
};

const sourceLabel = (s: string): string => SOURCE_LABEL[s] ?? s;
const sourceClass = (s: string): string => 'src-' + s.toLowerCase().replace(/[^a-z]/g, '');

const fmtDate = (iso: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

const shortId = (id: string): string => (id.length > 8 ? id.slice(0, 8) : id);

export const AuditLogList = () => {
  const t = useTranslate();
  const [perPage, setPerPage] = useState(50);
  const [action, setAction] = useState<'all' | string>('all');
  const [q, setQ] = useState('');

  const {
    data: logs = [],
    total = 0,
    isLoading,
  } = useGetList<AuditLog>('audit-logs', {
    pagination: { page: 1, perPage },
    sort: { field: 'createdAt', order: 'DESC' },
  });

  const rows = useMemo(() => {
    let r = logs;
    if (action !== 'all') r = r.filter((l) => l.action === action);
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      r = r.filter(
        (l) =>
          l.entity.toLowerCase().includes(qq) ||
          l.entityId.toLowerCase().includes(qq) ||
          (l.user?.name ?? '').toLowerCase().includes(qq) ||
          l.action.toLowerCase().includes(qq) ||
          l.appSource.toLowerCase().includes(qq),
      );
    }
    return r;
  }, [logs, action, q]);

  return (
    <CelvaSkin>
      <Title title={t('resources.audit-logs.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="toolbar">
          <div style={{ maxWidth: '52ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              Journal d&rsquo;activité
            </div>
            <div className="note">
              Trace en lecture seule de toutes les actions sensibles — qui a fait quoi, quand,
              et depuis quelle application. Aucune entrée ne peut être modifiée ou supprimée.
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="search">
            <SearchIcon />
            <input
              placeholder="Rechercher (entité, acteur, action…)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="audit-legend">
          {ACTION_ORDER.map((a) => {
            const meta = metaFor(a);
            return (
              <span key={a} className="leg-item">
                <span className="leg-dot" style={{ background: `var(--st-${meta.sc.slice(2)})` }} />
                {meta.label}
              </span>
            );
          })}
        </div>

        <div className="subfilters">
          <button
            className={`chip${action === 'all' ? ' on' : ''}`}
            onClick={() => setAction('all')}
          >
            Tous
          </button>
          {ACTION_ORDER.map((a) => (
            <button
              key={a}
              className={`chip${action === a ? ' on' : ''}`}
              onClick={() => setAction(a)}
            >
              {metaFor(a).label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<HistoryIcon sx={{ fontSize: 40 }} />}
              title={isLoading ? t('ra.page.loading') : 'Aucune entrée pour ce filtre'}
              sub={
                isLoading
                  ? undefined
                  : 'Ajustez les filtres ou la recherche pour afficher les entrées du journal.'
              }
            />
          </div>
        ) : (
          <div className="card flow-scroll">
            <table className="flow-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Entité</th>
                  <th>Acteur</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const meta = metaFor(l.action);
                  return (
                    <tr key={l.id}>
                      <td className="au-when">
                        {fmtDate(l.createdAt)}
                        <span className="au-ago">{relativeFr(l.createdAt)}</span>
                      </td>
                      <td>
                        <span className={`pill ${meta.sc}`}>
                          <span className="pdot" />
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <span className="au-entity">{l.entity}</span>
                        {l.entityId && <span className="au-id">#{shortId(l.entityId)}</span>}
                      </td>
                      <td className="au-actor">{l.user?.name || l.userId || '—'}</td>
                      <td>
                        <span className={`src-tag ${sourceClass(l.appSource)}`}>
                          {sourceLabel(l.appSource)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && logs.length < total && (
          <div className="load-more">
            <button className="btn btn-ghost" onClick={() => setPerPage((p) => p + 50)}>
              Charger plus
            </button>
          </div>
        )}

        <div className="note" style={{ marginTop: 14, fontStyle: 'italic' }}>
          Consultation uniquement. Sont tracés : créations, modifications, suppressions,
          changements de statut, connexions et paiements.
        </div>
      </div>
    </CelvaSkin>
  );
};
