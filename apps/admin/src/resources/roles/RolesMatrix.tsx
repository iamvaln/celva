import { useState } from 'react';
import { Title, useTranslate } from 'react-admin';
import { CelvaSkin } from '../../components/CelvaSkin';
import {
  BACKOFFICE_ROLES,
  DOMAINS,
  ROLE_META,
  SCOPED,
  grantsFor,
  summaryFor,
} from '../../permissions';
import type { BackofficeRole, DomainSummary } from '../../permissions';
import './roles.css';

const SUMMARY_CLASS: Record<DomainSummary, string> = {
  full: 's-done',
  read: 's-info',
  partial: 's-todo',
  none: 's-neutral',
};

/**
 * Read-only Roles & permissions matrix (Settings › Rôles & permissions).
 * Renders the canonical RBAC model from permissions.ts — no editing,
 * no persistence. Pick a role, see its per-domain access summary and the
 * granted/denied actions. SUPER_ADMIN is flagged as full-access & locked.
 */
export const RolesMatrix = () => {
  const t = useTranslate();
  const [role, setRole] = useState<BackofficeRole>('ADMIN');

  const meta = ROLE_META[role];
  const isSuper = Boolean(meta.isSuper);
  const lc = role.toLowerCase();

  return (
    <CelvaSkin>
      <Title title={t('ui.roles.title')} />
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ maxWidth: '60ch', marginBottom: 18 }}>
          <div className="section-label" style={{ margin: '0 0 6px' }}>
            {t('ui.roles.title')}
          </div>
          <div className="note">{t('ui.roles.intro')}</div>
        </div>

        {/* Role chips */}
        <div className="roles-chips" role="tablist">
          {BACKOFFICE_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={role === r}
              className={`role-chip${role === r ? ' on' : ''}`}
              style={{ ['--rc' as string]: ROLE_META[r].tone }}
              onClick={() => setRole(r)}
            >
              <span className="rc-dot" />
              {t(`ui.roles.role_${r.toLowerCase()}`)}
              {ROLE_META[r].isSuper && (
                <span className="rc-sys">{t('ui.roles.system_tag')}</span>
              )}
            </button>
          ))}
        </div>

        {/* Selected role banner */}
        <div
          className="role-banner"
          style={{ ['--rc' as string]: meta.tone }}
        >
          <span className="rb-name">
            <span className="rb-dot" />
            {t(`ui.roles.role_${lc}`)}
          </span>
          <span className="note rb-desc">{t(`ui.roles.desc_${lc}`)}</span>
          {isSuper && (
            <span className="pill s-done">
              <span className="pdot" />
              {t('ui.roles.system_tag')}
            </span>
          )}
        </div>

        {isSuper && (
          <div className="role-callout">{t('ui.roles.super_note')}</div>
        )}

        {/* Matrix */}
        <div className="card perm-scroll">
          <table className="perm-matrix">
            <thead>
              <tr>
                <th>{t('ui.roles.col_domain')}</th>
                <th>{t('ui.roles.col_summary')}</th>
                <th>{t('ui.roles.col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {DOMAINS.map((domain) => {
                const granted = grantsFor(role, domain.id);
                const summary = summaryFor(role, domain.id);
                const scoped = Boolean(SCOPED[role]?.[domain.id]);
                return (
                  <tr key={domain.id}>
                    <td>
                      <div className="perm-dom">
                        <span className="pd-name">
                          {t(`ui.roles.domain_${domain.id}`)}
                        </span>
                        {scoped && (
                          <span className="perm-scope">
                            ◐ {t('ui.roles.scoped')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="perm-summary-cell">
                      <span className={`pill ${SUMMARY_CLASS[summary]}`}>
                        <span className="pdot" />
                        {t(`ui.roles.summary_${summary}`)}
                      </span>
                    </td>
                    <td>
                      <div className="perm-acts">
                        {domain.actions.map((action) => {
                          const on = granted.includes(action);
                          return (
                            <span
                              key={action}
                              className={`perm-chip${on ? ' on' : ''}`}
                            >
                              <span className="pc-box">{on ? '✓' : ''}</span>
                              {t(`ui.roles.action_${action}`)}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="note" style={{ marginTop: 12, fontStyle: 'italic' }}>
          {t('ui.roles.footnote')}
        </div>
      </div>
    </CelvaSkin>
  );
};

export default RolesMatrix;
