import './audit-logs.css';
import { useMemo, useState } from 'react';
import { Title, useGetList, useTranslate } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { relativeFr } from '../orders/orderSkin';
import type { AuditLog } from '../../types';

/** Action → status hue (the design's action-type legend); label resolved via t().
 *  CREATE→s-done, UPDATE→s-info, DELETE→s-urgent (per spec). */
const ACTION_SC: Record<string, string> = {
  CREATE: 's-done',
  UPDATE: 's-info',
  DELETE: 's-urgent',
  STATUS_CHANGE: 's-todo',
  LOGIN: 's-neutral',
  PAY: 's-todo',
};

/** Common actions shown as filter chips, in legend order. */
const ACTION_ORDER = ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN', 'PAY'];

const scFor = (action: string): string => ACTION_SC[action] ?? 's-neutral';

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

  /** Action → translated label (falls back to the raw action code). */
  const actionLabel = (a: string): string =>
    a in ACTION_SC ? t(`ui.audit-logs.action_${a}`) : a;
  /** appSource → translated label (falls back to the raw source code). */
  const sourceLabel = (s: string): string => t(`ui.audit-logs.source_${s}`, { _: s });

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
              {t('ui.audit-logs.title')}
            </div>
            <div className="note">{t('ui.audit-logs.intro')}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="search">
            <SearchIcon />
            <input
              placeholder={t('ui.audit-logs.searchPlaceholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="audit-legend">
          {ACTION_ORDER.map((a) => {
            const sc = scFor(a);
            return (
              <span key={a} className="leg-item">
                <span className="leg-dot" style={{ background: `var(--st-${sc.slice(2)})` }} />
                {actionLabel(a)}
              </span>
            );
          })}
        </div>

        <div className="subfilters">
          <button
            className={`chip${action === 'all' ? ' on' : ''}`}
            onClick={() => setAction('all')}
          >
            {t('ui.audit-logs.filterAll')}
          </button>
          {ACTION_ORDER.map((a) => (
            <button
              key={a}
              className={`chip${action === a ? ' on' : ''}`}
              onClick={() => setAction(a)}
            >
              {actionLabel(a)}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<HistoryIcon sx={{ fontSize: 40 }} />}
              title={isLoading ? t('ra.page.loading') : t('ui.audit-logs.empty')}
              sub={isLoading ? undefined : t('ui.audit-logs.emptySub')}
            />
          </div>
        ) : (
          <div className="card flow-scroll">
            <table className="flow-table">
              <thead>
                <tr>
                  <th>{t('ui.audit-logs.colDate')}</th>
                  <th>{t('ui.audit-logs.colAction')}</th>
                  <th>{t('ui.audit-logs.colEntity')}</th>
                  <th>{t('ui.audit-logs.colActor')}</th>
                  <th>{t('ui.audit-logs.colSource')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  return (
                    <tr key={l.id}>
                      <td className="au-when">
                        {fmtDate(l.createdAt)}
                        <span className="au-ago">{relativeFr(l.createdAt, t)}</span>
                      </td>
                      <td>
                        <span className={`pill ${scFor(l.action)}`}>
                          <span className="pdot" />
                          {actionLabel(l.action)}
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
              {t('ui.audit-logs.loadMore')}
            </button>
          </div>
        )}

        <div className="note" style={{ marginTop: 14, fontStyle: 'italic' }}>
          {t('ui.audit-logs.footnote')}
        </div>
      </div>
    </CelvaSkin>
  );
};
