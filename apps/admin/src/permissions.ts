/**
 * Canonical RBAC model for the back-office (UX §2). Single source of truth for
 * the menu gating, the per-resource edit/create gates, and the read-only
 * permission matrix screen. Mirrors the design's PERM_SEED. SUPER_ADMIN is
 * implicit (every action everywhere) and also bypasses the API RolesGuard.
 */

export type Domain =
  | 'orders'
  | 'deliveries'
  | 'payments'
  | 'invoices'
  | 'promo'
  | 'catalog'
  | 'stock'
  | 'commercial'
  | 'content'
  | 'finance'
  | 'users'
  | 'settings'
  | 'roles'
  | 'audit';

export type PermAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'cancel'
  | 'delete'
  | 'collect'
  | 'resend'
  | 'export'
  | 'reconcile'
  | 'pay'
  | 'transfer'
  | 'configure';

export type BackofficeRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'CATALOG_MANAGER'
  | 'FINANCE'
  | 'SUPPORT'
  | 'SALES_REP'
  | 'DELIVERER';

export const DOMAINS: { id: Domain; actions: PermAction[] }[] = [
  { id: 'orders', actions: ['view', 'create', 'edit', 'cancel'] },
  { id: 'deliveries', actions: ['view', 'edit'] },
  { id: 'payments', actions: ['view', 'collect'] },
  { id: 'invoices', actions: ['view', 'create', 'resend', 'export'] },
  { id: 'promo', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'catalog', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'stock', actions: ['view', 'create', 'edit'] },
  { id: 'commercial', actions: ['view', 'create', 'reconcile', 'pay'] },
  { id: 'content', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'finance', actions: ['view', 'create', 'transfer', 'export'] },
  { id: 'users', actions: ['view', 'create', 'edit'] },
  { id: 'settings', actions: ['view', 'configure'] },
  { id: 'roles', actions: ['view', 'configure'] },
  { id: 'audit', actions: ['view', 'export'] },
];

export const ROLE_META: Record<BackofficeRole, { tone: string; isSuper?: boolean }> = {
  SUPER_ADMIN: { tone: '#5F7347', isSuper: true },
  ADMIN: { tone: '#5B7C95' },
  MANAGER: { tone: '#9A7B3A' },
  CATALOG_MANAGER: { tone: '#B26248' },
  FINANCE: { tone: '#6E4A86' },
  SUPPORT: { tone: '#50857D' },
  SALES_REP: { tone: '#C48A9A' },
  DELIVERER: { tone: '#8A6A52' },
};

export const BACKOFFICE_ROLES = Object.keys(ROLE_META) as BackofficeRole[];

// Per-role grants — { domain: [granted actions] }. SUPER_ADMIN is implicit.
const PERM_SEED: Record<Exclude<BackofficeRole, 'SUPER_ADMIN'>, Partial<Record<Domain, PermAction[]>>> = {
  ADMIN: {
    orders: ['view', 'create', 'edit', 'cancel'],
    deliveries: ['view', 'edit'],
    payments: ['view', 'collect'],
    invoices: ['view', 'create', 'resend', 'export'],
    promo: ['view', 'create', 'edit', 'delete'],
    catalog: ['view', 'create', 'edit', 'delete'],
    stock: ['view', 'create', 'edit'],
    commercial: ['view', 'create', 'reconcile', 'pay'],
    content: ['view', 'create', 'edit', 'delete'],
    finance: ['view', 'create', 'transfer', 'export'],
    users: ['view'],
    settings: ['view', 'configure'],
    roles: [],
    audit: ['view'],
  },
  MANAGER: {
    orders: ['view', 'create', 'edit', 'cancel'],
    deliveries: ['view', 'edit'],
    payments: ['view', 'collect'],
    invoices: ['view', 'resend'],
    promo: ['view'],
    catalog: ['view'],
    stock: ['view', 'create', 'edit'],
    commercial: ['view', 'create', 'reconcile'],
  },
  CATALOG_MANAGER: {
    catalog: ['view', 'create', 'edit', 'delete'],
    stock: ['view'],
    content: ['view', 'create', 'edit', 'delete'],
  },
  FINANCE: {
    orders: ['view'],
    deliveries: ['view'],
    payments: ['view'],
    invoices: ['view', 'export'],
    stock: ['view'],
    commercial: ['view'],
    finance: ['view', 'export'],
    audit: ['view'],
  },
  SUPPORT: {
    orders: ['view', 'edit'],
    deliveries: ['view'],
    payments: ['view'],
    invoices: ['view', 'resend'],
    catalog: ['view'],
  },
  SALES_REP: {
    orders: ['view', 'create'],
    catalog: ['view'],
    commercial: ['view'],
  },
  DELIVERER: {
    deliveries: ['view', 'edit'],
    payments: ['collect'],
  },
};

// Domains that are scoped to "own data only" for some roles (API-enforced note).
export const SCOPED: Partial<Record<BackofficeRole, Partial<Record<Domain, true>>>> = {
  SALES_REP: { orders: true, commercial: true },
  DELIVERER: { deliveries: true, payments: true },
  SUPPORT: { orders: true },
};

export const grantsFor = (role: string | undefined, domain: Domain): PermAction[] => {
  if (!role) return [];
  if (ROLE_META[role as BackofficeRole]?.isSuper) {
    return DOMAINS.find((d) => d.id === domain)?.actions ?? [];
  }
  return PERM_SEED[role as Exclude<BackofficeRole, 'SUPER_ADMIN'>]?.[domain] ?? [];
};

export type DomainSummary = 'full' | 'read' | 'partial' | 'none';

export const summaryFor = (role: string | undefined, domain: Domain): DomainSummary => {
  const all = DOMAINS.find((d) => d.id === domain)?.actions ?? [];
  const g = grantsFor(role, domain);
  if (g.length === 0) return 'none';
  if (g.length === all.length) return 'full';
  if (g.length === 1 && g[0] === 'view') return 'read';
  return 'partial';
};

// ── Convenience helpers used by the menu + per-resource gates ──
export const isSuperAdmin = (p?: string): boolean => p === 'SUPER_ADMIN';
export const isAdminLevel = (p?: string): boolean => p === 'SUPER_ADMIN' || p === 'ADMIN';
export const can = (p: string | undefined, domain: Domain, action: PermAction): boolean =>
  grantsFor(p, domain).includes(action);
export const canView = (p: string | undefined, domain: Domain): boolean => can(p, domain, 'view');
