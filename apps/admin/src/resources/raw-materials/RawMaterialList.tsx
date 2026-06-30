import './raw-materials.css';
import { useEffect, useMemo, useState } from 'react';
import { Title, useGetList, useRedirect, useTranslate } from 'react-admin';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LayersIcon from '@mui/icons-material/Layers';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA } from '../orders/orderSkin';

/** Local mirror of the raw-materials list row (kept local per module scope). */
type RawMaterialType = 'FABRIC' | 'ACCESSORY' | 'PACKAGING' | 'OTHER';

interface RawMaterialRow {
  id: string;
  name: string;
  type: RawMaterialType;
  unit: string;
  unitPrice: string | number;
  stockQty: string | number;
  alertThreshold: string | number | null;
  isLowStock: boolean;
  supplierId: string;
  supplier?: { id: string; name: string };
}

type TypeFilter = 'all' | RawMaterialType;

const TYPES: RawMaterialType[] = ['FABRIC', 'ACCESSORY', 'PACKAGING', 'OTHER'];

/** Swatch tone + chip status-class per type (no fake photos). */
const TYPE_SKIN: Record<RawMaterialType, { tone: string; sc: string }> = {
  FABRIC: { tone: '#595D40', sc: 's-info' },
  ACCESSORY: { tone: '#8C8680', sc: 's-neutral' },
  PACKAGING: { tone: '#C9A87C', sc: 's-todo' },
  OTHER: { tone: '#B26248', sc: 's-done' },
};

const num = (v: string | number): number => Number(v) || 0;

const fmtQty = (v: string | number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(num(v));

/** Short alphanumeric reference derived from the material name (UI only). */
const refOf = (m: RawMaterialRow): string =>
  m.name
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 4)
    .toUpperCase() || m.id.slice(0, 4).toUpperCase();

export const RawMaterialList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const { data, isLoading } = useGetList<RawMaterialRow>('raw-materials', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'name', order: 'ASC' },
  });

  const [items, setItems] = useState<RawMaterialRow[]>([]);
  const [q, setQ] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [lowOnly, setLowOnly] = useState(false);
  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const rows = useMemo(() => {
    let r = items;
    if (type !== 'all') r = r.filter((m) => m.type === type);
    if (lowOnly) r = r.filter((m) => m.isLowStock);
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter(
        (m) =>
          m.name.toLowerCase().includes(qq) ||
          (m.supplier?.name ?? '').toLowerCase().includes(qq) ||
          refOf(m).toLowerCase().includes(qq),
      );
    }
    return r;
  }, [items, type, lowOnly, q]);

  const lowCount = items.filter((m) => m.isLowStock).length;
  const stockValue = items.reduce((sum, m) => sum + num(m.stockQty) * num(m.unitPrice), 0);
  const fabricCount = items.filter((m) => m.type === 'FABRIC').length;

  const typeLabel = (ty: RawMaterialType) => t(`resources.raw-materials.types.${ty}`);

  return (
    <CelvaSkin>
      <Title title={t('resources.raw-materials.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="toolbar">
          <div className="search">
            <SearchIcon />
            <input
              placeholder={t('resources.raw-materials.search')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => redirect('create', 'raw-materials')}>
            <AddIcon sx={{ fontSize: 16 }} /> {t('resources.raw-materials.add')}
          </button>
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v">{items.length}</div>
            <div className="ds-l">{t('resources.raw-materials.summary.total')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{fmtFCFA(stockValue)}</div>
            <div className="ds-l">{t('resources.raw-materials.summary.stock_value')}</div>
          </div>
          <div className={`ds-item${lowCount > 0 ? ' warn' : ''}`}>
            <div className="ds-v">{lowCount}</div>
            <div className="ds-l">{t('resources.raw-materials.summary.low_stock')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{fabricCount}</div>
            <div className="ds-l">{t('resources.raw-materials.summary.fabrics')}</div>
          </div>
        </div>

        <div className="subfilters">
          <button
            className={`chip${type === 'all' ? ' on' : ''}`}
            onClick={() => setType('all')}
          >
            {t('resources.raw-materials.filters.all')}
          </button>
          {TYPES.map((ty) => (
            <button
              key={ty}
              className={`chip${type === ty ? ' on' : ''}`}
              onClick={() => setType(ty)}
            >
              <span className="cdot" style={{ ['--cd' as string]: TYPE_SKIN[ty].tone }} />
              {typeLabel(ty)}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            className={`chip${lowOnly ? ' on' : ''}`}
            onClick={() => setLowOnly((v) => !v)}
          >
            <WarningAmberIcon sx={{ fontSize: 13 }} /> {t('resources.raw-materials.low_stock')}
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<LayersIcon sx={{ fontSize: 40 }} />}
              title={isLoading ? t('ra.page.loading') : t('resources.raw-materials.empty')}
            />
          </div>
        ) : (
          <div className="list-wrap">
            {rows.map((m) => {
              const skin = TYPE_SKIN[m.type];
              const qty = num(m.stockQty);
              const stockClass = qty <= 0 ? ' zero' : m.isLowStock ? ' low' : '';
              const threshold = m.alertThreshold;
              return (
                <div
                  key={m.id}
                  className="lrow mat"
                  onClick={() => redirect('edit', 'raw-materials', m.id)}
                >
                  <div className="mat-thumb" style={{ ['--mt' as string]: skin.tone }}>
                    <span className="mt-ref">{refOf(m)}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="lname">{m.name}</div>
                    <div className="lsub">
                      <span>{m.supplier?.name ?? '—'}</span>
                      <span>·</span>
                      <span className="lref">{m.unit}</span>
                    </div>
                  </div>
                  <div className="mat-type">
                    <span className={`pill ${skin.sc}`}>
                      <span className="pdot" />
                      {typeLabel(m.type)}
                    </span>
                  </div>
                  <div className="lcell">
                    <div className="stockwrap">
                      {m.isLowStock && (
                        <span
                          className="pill s-todo solid"
                          title={t('resources.raw-materials.low_stock')}
                        >
                          {t('resources.raw-materials.alert')}
                        </span>
                      )}
                      <div>
                        <div className={`stocknum${stockClass}`}>{fmtQty(qty)}</div>
                        <div className="stocklbl">
                          {m.unit}
                          {threshold !== null && threshold !== undefined
                            ? ` · ${t('resources.raw-materials.threshold_short')} ${fmtQty(threshold)}`
                            : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="lcell mat-cost">
                    <div className="lc-v">{fmtFCFA(m.unitPrice)}</div>
                    <div className="lc-l">
                      {t('resources.raw-materials.cost_per')}/{m.unit}
                    </div>
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
