import { useEffect, useMemo, useState } from 'react';
import { Title, useGetList, useRedirect, useStore } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Category } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA } from '../orders/orderSkin';

const LOW_THRESHOLD = 5;

type AdminProductRow = {
  id: string;
  name: { fr: string; en: string };
  slug: string;
  displayPrice: string | number;
  costPrice: string | number;
  isActive: boolean;
  categoryId: string;
  category?: { name: { fr: string; en: string } };
  primaryImageKey: string | null;
  variantCount: number;
  stockTotal: number;
  consignedTotal: number;
};

type Display = 'active' | 'low' | 'out' | 'inactive';
const statusOf = (p: AdminProductRow): Display =>
  !p.isActive ? 'inactive' : p.stockTotal === 0 ? 'out' : p.stockTotal <= LOW_THRESHOLD ? 'low' : 'active';

const STATUS_META: Record<Display, { label: string; sc: string }> = {
  active: { label: 'Actif', sc: 's-done' },
  low: { label: 'Stock bas', sc: 's-todo' },
  out: { label: 'Rupture', sc: 's-urgent' },
  inactive: { label: 'Inactif', sc: 's-neutral' },
};

const TABS: Array<{ id: string; label: string; match: (d: Display) => boolean }> = [
  { id: 'all', label: 'Tous', match: () => true },
  { id: 'active', label: 'Actifs', match: (d) => d === 'active' || d === 'low' || d === 'out' },
  { id: 'low', label: 'Stock bas', match: (d) => d === 'low' },
  { id: 'out', label: 'Rupture', match: (d) => d === 'out' },
  { id: 'inactive', label: 'Inactifs', match: (d) => d === 'inactive' },
];

const StatusPill = ({ d }: { d: Display }) => {
  const s = STATUS_META[d];
  return (
    <span className={`pill ${s.sc}`}>
      <span className="pdot" />
      {s.label}
    </span>
  );
};

export const ProductList = () => {
  const redirect = useRedirect();
  const [view, setView] = useStore<'grid' | 'list'>('celva.products.view', 'grid');
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState<'recent' | 'stock' | 'price'>('recent');
  const [rows, setRows] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: categories = [] } = useGetList<Category>('categories', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'sortOrder', order: 'ASC' },
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { body } = await fetchJson<{ data: AdminProductRow[] }>(
          `${API_BASE}/products/admin?pageSize=100&sortBy=createdAt&sortDir=desc`,
        );
        if (!cancelled) setRows(body.data);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const open = (id: string) => redirect('show', 'products', id);

  const filtered = useMemo(() => {
    const tabDef = TABS.find((tt) => tt.id === tab) ?? TABS[0]!;
    let r = rows.filter((p) => tabDef.match(statusOf(p)));
    if (cat !== 'all') r = r.filter((p) => p.categoryId === cat);
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter(
        (p) => p.name.fr.toLowerCase().includes(qq) || p.slug.toLowerCase().includes(qq),
      );
    }
    r = r.slice().sort((a, b) =>
      sort === 'price'
        ? Number(b.displayPrice) - Number(a.displayPrice)
        : sort === 'stock'
          ? a.stockTotal - b.stockTotal
          : 0,
    );
    return r;
  }, [rows, tab, cat, q, sort]);

  const totalStock = rows.reduce((s, p) => s + p.stockTotal, 0);
  const stockValue = rows.reduce((s, p) => s + p.stockTotal * Number(p.costPrice), 0);
  const restock = rows.filter((p) => {
    const d = statusOf(p);
    return d === 'low' || d === 'out';
  }).length;

  const stockClass = (p: AdminProductRow) =>
    p.stockTotal === 0 ? 'zero' : p.stockTotal <= LOW_THRESHOLD ? 'low' : '';

  return (
    <CelvaSkin>
      <Title title="Produits" />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        {/* summary strip */}
        <div className="cat-summary">
          <div className="cs-item">
            <div className="cs-v num">{rows.length}</div>
            <div className="cs-l">produits</div>
          </div>
          <div className="cs-item">
            <div className="cs-v num">{totalStock}</div>
            <div className="cs-l">pièces en stock</div>
          </div>
          <div className="cs-item">
            <div className="cs-v num">{fmtFCFA(stockValue)}</div>
            <div className="cs-l">valeur stock (HT)</div>
          </div>
          <div className={`cs-item${restock ? ' warn' : ''}`}>
            <div className="cs-v num">{restock}</div>
            <div className="cs-l">à réassortir</div>
          </div>
        </div>

        {/* toolbar */}
        <div className="toolbar">
          <div className="search">
            <SearchIcon />
            <input
              placeholder="Rechercher un produit ou SKU…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <div className="seg viewseg">
            <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} title="Grille">
              <GridViewIcon sx={{ fontSize: 16 }} />
            </button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} title="Liste">
              <ViewListIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className="tabs">
          {TABS.map((tt) => {
            const n = rows.filter((p) => tt.match(statusOf(p))).length;
            return (
              <button
                key={tt.id}
                className={`tab${tt.id === tab ? ' active' : ''}`}
                onClick={() => setTab(tt.id)}
              >
                {tt.label}
                <span className="tcount num">{n}</span>
              </button>
            );
          })}
        </div>

        {/* category chips + sort */}
        <div className="subfilters">
          <button className={`chip${cat === 'all' ? ' on' : ''}`} onClick={() => setCat('all')}>
            Toutes catégories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`chip${cat === c.id ? ' on' : ''}`}
              onClick={() => setCat(c.id)}
            >
              {c.name?.fr ?? c.slug}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span className="note" style={{ marginRight: 4 }}>
            Trier
          </span>
          <button className={`chip${sort === 'recent' ? ' on' : ''}`} onClick={() => setSort('recent')}>
            Récents
          </button>
          <button className={`chip${sort === 'stock' ? ' on' : ''}`} onClick={() => setSort('stock')}>
            Stock
          </button>
          <button className={`chip${sort === 'price' ? ' on' : ''}`} onClick={() => setSort('price')}>
            Prix
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Inventory2Icon sx={{ fontSize: 44 }} />}
              title={loading ? 'Chargement…' : 'Aucun produit dans cette vue'}
              sub={loading ? undefined : 'Aucun résultat ne correspond à ces filtres.'}
              actionLabel={loading ? undefined : 'Réinitialiser les filtres'}
              onAction={() => {
                setTab('all');
                setQ('');
                setCat('all');
              }}
            />
          </div>
        ) : view === 'list' ? (
          <div className="prod-listwrap">
            {filtered.map((p) => {
              const d = statusOf(p);
              return (
                <button
                  key={p.id}
                  className={`prod-row${d === 'inactive' || d === 'out' ? ' dim' : ''}`}
                  onClick={() => open(p.id)}
                >
                  <span className="pr-thumb">
                    <Inventory2Icon sx={{ fontSize: 18 }} />
                  </span>
                  <div className="pr-main">
                    <div className="pr-name">{p.name.fr}</div>
                    <div className="pr-sub">
                      <span>{p.category?.name?.fr ?? '—'}</span>
                      <span>·</span>
                      <span>
                        {p.variantCount} variante{p.variantCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="pr-stockcell">
                    <div className={`pr-stocknum num ${stockClass(p)}`}>{p.stockTotal}</div>
                    <div className="pr-stocklbl">
                      {p.consignedTotal ? `${p.consignedTotal} consignées` : 'en stock'}
                    </div>
                  </div>
                  <div className="pr-price num">{fmtFCFA(p.displayPrice)}</div>
                  <StatusPill d={d} />
                  <div className="pr-chev">
                    <ChevronRightIcon sx={{ fontSize: 18 }} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="prod-grid">
            {filtered.map((p) => {
              const d = statusOf(p);
              return (
                <button
                  key={p.id}
                  className={`prod-card${d === 'inactive' || d === 'out' ? ' dim' : ''}`}
                  onClick={() => open(p.id)}
                >
                  <div className="pc-media">
                    <Inventory2Icon sx={{ fontSize: 36 }} />
                    <div className="pc-badge">
                      <StatusPill d={d} />
                    </div>
                  </div>
                  <div className="pc-body">
                    <div className="pc-cat">{p.category?.name?.fr ?? '—'}</div>
                    <div className="pc-name">{p.name.fr}</div>
                    <div className="pc-foot">
                      <span className="pc-price num">{fmtFCFA(p.displayPrice)}</span>
                      <span className={`pc-stock ${stockClass(p)}`}>
                        {p.stockTotal === 0 ? 'Rupture' : `${p.stockTotal} en stock`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
