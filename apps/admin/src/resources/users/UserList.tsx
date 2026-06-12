import './users.css';
import { type CSSProperties, useMemo, useState } from 'react';
import { Title, useGetIdentity, useGetList, useRedirect } from 'react-admin';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';

/**
 * User row as returned by the admin `users` list endpoint (PUBLIC_SELECT in
 * users.service.ts). Defined locally — types.ts is shared and off-limits for
 * this module. The list carries no server-side aggregates; the summary strip
 * and counts below are derived client-side from the loaded page.
 */
type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'ADMIN' | 'MANAGER' | 'DELIVERER' | 'CLIENT' | 'SALES_REP';
  isActive: boolean;
  createdAt: string;
};

type RoleFilter = 'all' | UserRow['role'];

/** FR label + status hue for each role (per design role-badge tones). */
const ROLE_META: Record<UserRow['role'], { label: string; hue: string }> = {
  ADMIN: { label: 'Administrateur', hue: 's-urgent' },
  MANAGER: { label: 'Manager', hue: 's-info' },
  SALES_REP: { label: 'Commercial', hue: 's-todo' },
  DELIVERER: { label: 'Livreur', hue: 's-neutral' },
  CLIENT: { label: 'Client', hue: 's-neutral' },
};

/** CSS var fed to the avatar tint; mirrors the role-badge tone. */
const ROLE_TONE: Record<UserRow['role'], string> = {
  ADMIN: 'var(--st-urgent)',
  MANAGER: 'var(--st-info)',
  SALES_REP: 'var(--st-todo)',
  DELIVERER: 'var(--st-neutral)',
  CLIENT: 'var(--st-neutral)',
};

const ROLE_ORDER: UserRow['role'][] = ['ADMIN', 'MANAGER', 'SALES_REP', 'DELIVERER', 'CLIENT'];

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';

export const UserList = () => {
  const redirect = useRedirect();
  const { identity } = useGetIdentity();
  const { data, isLoading } = useGetList<UserRow>('users', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'createdAt', order: 'DESC' },
  });

  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const users = useMemo(() => data ?? [], [data]);

  const rows = useMemo(() => {
    let r = users;
    if (roleFilter !== 'all') r = r.filter((u) => u.role === roleFilter);
    if (activeFilter === 'active') r = r.filter((u) => u.isActive);
    if (activeFilter === 'inactive') r = r.filter((u) => !u.isActive);
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter(
        (u) =>
          u.name.toLowerCase().includes(qq) || u.email.toLowerCase().includes(qq),
      );
    }
    return r;
  }, [users, roleFilter, activeFilter, q]);

  const activeN = users.filter((u) => u.isActive).length;
  const inactiveN = users.length - activeN;

  // Roles actually present, in canonical order, for the filter chips.
  const presentRoles = ROLE_ORDER.filter((role) => users.some((u) => u.role === role));

  const filtering = q.trim() !== '' || roleFilter !== 'all' || activeFilter !== 'all';

  return (
    <CelvaSkin>
      <Title title="Utilisateurs" />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="toolbar">
          <div className="search">
            <SearchIcon />
            <input
              placeholder="Rechercher un utilisateur…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => redirect('create', 'users')}>
            <AddIcon sx={{ fontSize: 16 }} /> Utilisateur
          </button>
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v">{users.length}</div>
            <div className="ds-l">Utilisateurs</div>
          </div>
          <div className="ds-item">
            <div className="ds-v" style={{ color: 'var(--st-done)' }}>
              {activeN}
            </div>
            <div className="ds-l">Actifs</div>
          </div>
          <div className={`ds-item${inactiveN ? ' warn' : ''}`}>
            <div className="ds-v">{inactiveN}</div>
            <div className="ds-l">Désactivés</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{presentRoles.length}</div>
            <div className="ds-l">Rôles présents</div>
          </div>
        </div>

        <div className="subfilters">
          <button
            className={`chip${roleFilter === 'all' ? ' on' : ''}`}
            onClick={() => setRoleFilter('all')}
          >
            Tous les rôles
          </button>
          {presentRoles.map((role) => (
            <button
              key={role}
              className={`chip${roleFilter === role ? ' on' : ''}`}
              onClick={() => setRoleFilter(role)}
            >
              {ROLE_META[role].label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {(
            [
              ['all', 'Tous'],
              ['active', 'Actifs'],
              ['inactive', 'Désactivés'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={`chip${activeFilter === id ? ' on' : ''}`}
              onClick={() => setActiveFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<PeopleOutlineIcon sx={{ fontSize: 40 }} />}
              title={
                isLoading
                  ? 'Chargement…'
                  : filtering
                    ? 'Aucun utilisateur pour cette recherche'
                    : 'Aucun utilisateur'
              }
              actionLabel={!isLoading && !filtering ? 'Ajouter un utilisateur' : undefined}
              onAction={!isLoading && !filtering ? () => redirect('create', 'users') : undefined}
            />
          </div>
        ) : (
          <div className="list-wrap">
            {rows.map((u) => {
              const meta = ROLE_META[u.role];
              const isSelf = identity?.id != null && String(identity.id) === String(u.id);
              return (
                <div
                  key={u.id}
                  className={`lrow user${u.isActive ? '' : ' archived'}`}
                  onClick={() => redirect('show', 'users', u.id)}
                >
                  <div
                    className="user-av"
                    style={{ '--av': ROLE_TONE[u.role] } as CSSProperties}
                  >
                    {initials(u.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="lname">
                      {u.name}
                      {isSelf && <span className="self-tag">vous</span>}
                    </div>
                    <div className="lsub">
                      <span>{u.email}</span>
                      {u.phone && <span>·</span>}
                      {u.phone && <span>{u.phone}</span>}
                    </div>
                  </div>
                  <div>
                    <span className={`pill ${meta.hue}`}>{meta.label}</span>
                  </div>
                  <div className="u-status-cell">
                    <span className="u-tags">
                      {u.isActive ? (
                        <span className="pill s-done">
                          <span className="pdot" />
                          Actif
                        </span>
                      ) : (
                        <span className="pill s-neutral">
                          <span className="pdot" />
                          Désactivé
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="lchev">
                    <ChevronRightIcon sx={{ fontSize: 18 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
