import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Title, useNotify, useRedirect, useTranslate } from 'react-admin';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CategoryIcon from '@mui/icons-material/Category';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import { CelvaSkin } from '../../components/CelvaSkin';
import { DetailActions } from '../../components/DetailActions';
import { fmtFCFA } from '../orders/orderSkin';

const TVA = 0.1925;
const LOW = 5;

const PRODTYPE: Record<string, string> = {
  INTERNAL: 'ui.products.prodtype_internal',
  SUBCONTRACTED: 'ui.products.prodtype_subcontracted',
  PURCHASED: 'ui.products.prodtype_purchased',
};

type Loc = { fr: string; en: string };
type AdminProductDetail = {
  id: string;
  name: Loc;
  slug: string;
  description?: Loc | null;
  displayPrice: string | number;
  floorPrice: string | number;
  costPrice: string | number;
  productionType: string;
  isActive: boolean;
  defaultCommissionType: string;
  defaultCommissionValue: string | number;
  category?: { id: string; name: Loc } | null;
  attributes: Array<{ id: string; name: Loc; values: Loc[] }>;
  variants: Array<{
    id: string;
    sku: string;
    stock: number;
    consignedStock: number;
    priceOverride: string | number | null;
    isActive: boolean;
    attributes: Record<string, string>;
  }>;
};

const StatusPill = ({ p }: { p: AdminProductDetail }) => {
  const t = useTranslate();
  const stock = p.variants.reduce((s, v) => s + v.stock, 0);
  const [labelKey, sc] = !p.isActive
    ? ['ui.products.status_inactive', 's-neutral']
    : stock === 0
      ? ['ui.products.status_out', 's-urgent']
      : stock <= LOW
        ? ['ui.products.status_low', 's-todo']
        : ['ui.products.status_active', 's-done'];
  return (
    <span className={`pill ${sc}`}>
      <span className="pdot" />
      {t(labelKey!)}
    </span>
  );
};

export const ProductShow = () => {
  const { id } = useParams();
  const t = useTranslate();
  const redirect = useRedirect();
  const notify = useNotify();
  const [p, setP] = useState<AdminProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { body } = await fetchJson<AdminProductDetail>(`${API_BASE}/products/admin/${id}`);
        if (!cancelled) setP(body);
      } catch {
        if (!cancelled) setP(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reload]);

  if (loading || !p) {
    return (
      <CelvaSkin>
        <div style={{ padding: 24 }} className="note">
          {loading ? t('ra.page.loading') : t('ui.products.not_found')}
        </div>
      </CelvaSkin>
    );
  }

  const display = Number(p.displayPrice);
  const floor = Number(p.floorPrice);
  const cost = Number(p.costPrice);
  const ht = display / (1 + TVA);
  const margin = ht - cost;
  const marginPct = ht > 0 ? Math.round((margin / ht) * 100) : 0;
  const floorMargin = floor / (1 + TVA) - cost;
  const floorBelowCost = floor / (1 + TVA) < cost;
  const stock = p.variants.reduce((s, v) => s + v.stock, 0);
  const attrNames = p.attributes.map((a) => a.name.fr);

  const setActive = async (active: boolean) => {
    try {
      await fetchJson(`${API_BASE}/products/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: active }),
      });
      notify(active ? t('ui.products.notify_published') : t('ui.products.notify_unpublished'), { type: 'success' });
      setReload((r) => r + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), { type: 'error' });
    }
  };

  const duplicate = async () => {
    try {
      const { body } = await fetchJson<{ id: string }>(`${API_BASE}/products/${p.id}/duplicate`, {
        method: 'POST',
      });
      notify(t('ui.products.notify_duplicated'), { type: 'success' });
      redirect('edit', 'products', body.id);
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), { type: 'error' });
    }
  };

  return (
    <CelvaSkin>
      <Title title={p.name.fr} />
      <div className="fade-in prod-detail" style={{ padding: '8px 4px 64px' }}>
        <button className="back-link" style={{ marginBottom: 16 }} onClick={() => redirect('list', 'products')}>
          <ArrowBackIcon sx={{ fontSize: 16 }} /> {t('ui.products.catalog')}
        </button>

        <div className="detail-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 className="prod-title">{p.name.fr}</h1>
            <div className="dh-meta" style={{ marginTop: 11 }}>
              <StatusPill p={p} />
              <span className="row" style={{ gap: 6 }}>
                <CategoryIcon sx={{ fontSize: 14 }} />
                {p.category?.name?.fr ?? '—'}
              </span>
              <span>·</span>
              <span>{PRODTYPE[p.productionType] ? t(PRODTYPE[p.productionType]!) : p.productionType}</span>
              <span>·</span>
              <span className="pr-sku">/{p.slug}</span>
            </div>
          </div>
          <div className="dh-actions">
            <button className="btn btn-ghost" onClick={duplicate}>
              {t('ui.products.duplicate')}
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => redirect('edit', 'products', p.id)}>
              <EditIcon sx={{ fontSize: 15 }} /> {t('ui.products.edit')}
            </button>
          </div>
        </div>

        <DetailActions
          actions={[
            p.isActive
              ? { label: t('ui.products.unpublish'), onClick: () => setActive(false) }
              : { icon: <CheckIcon sx={{ fontSize: 15 }} />, label: t('ui.products.publish'), onClick: () => setActive(true) },
          ]}
        />

        <div className="detail-grid">
          {/* left column */}
          <div className="grid">
            <div className="prod-overview">
              <div className="gallery">
                <div className="gal-main">
                  <Inventory2Icon sx={{ fontSize: 48 }} />
                </div>
              </div>
              <div className="po-text">
                <div className="section-label" style={{ marginBottom: 8 }}>
                  {t('ui.products.description')}
                </div>
                <p className="po-desc">{p.description?.fr || t('ui.products.no_description')}</p>
                {!p.isActive && (
                  <div className="callout" style={{ marginTop: 14 }}>
                    {t('ui.products.unpublished_notice')}
                  </div>
                )}
                {p.attributes.length > 0 && (
                  <div className="po-tags">
                    {p.attributes.map((a) => (
                      <div className="po-axis" key={a.id}>
                        <span className="po-axislbl">{a.name.fr}</span>
                        <div className="po-vals">
                          {a.values.map((v, i) => (
                            <span className="po-val" key={i}>
                              {v.fr}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="info-card">
              <div className="between" style={{ marginBottom: 14 }}>
                <h4 style={{ margin: 0 }}>{t('ui.products.variants_stock')}</h4>
                <span className="note">
                  {t('ui.products.variant_count', { smart_count: p.variants.length })} ·{' '}
                  {t('ui.products.in_stock_count', { smart_count: stock })}
                </span>
              </div>
              <div className="vtable-wrap">
                <table className="vtable">
                  <thead>
                    <tr>
                      {attrNames.map((n) => (
                        <th key={n}>{n}</th>
                      ))}
                      <th>{t('ui.products.col_sku')}</th>
                      <th className="rt">{t('ui.products.col_available')}</th>
                      <th className="rt">{t('ui.products.col_consigned')}</th>
                      <th className="rt">{t('ui.products.col_price')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.variants.map((v) => {
                      const out = v.stock === 0;
                      const low = v.stock > 0 && v.stock <= LOW;
                      return (
                        <tr key={v.id} className={out ? 'v-out' : low ? 'v-low' : ''}>
                          {attrNames.map((n) => (
                            <td key={n} className="v-attr">
                              {v.attributes[n] || '—'}
                            </td>
                          ))}
                          <td className="v-sku">{v.sku}</td>
                          <td className="rt">
                            <span className={`stock-chip${out ? ' zero' : low ? ' low' : ''}`}>{v.stock}</span>
                          </td>
                          <td className="rt muted num">{v.consignedStock || '—'}</td>
                          <td className="rt num">
                            {v.priceOverride ? (
                              <span>
                                {fmtFCFA(v.priceOverride)}
                                <span className="v-ov">{t('ui.products.price_overridden')}</span>
                              </span>
                            ) : (
                              <span className="muted">{fmtFCFA(display)}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* right column */}
          <div className="grid">
            <div className="margin-card">
              <div className="ml">{t('ui.products.unit_margin')}</div>
              <div className="mv num">{fmtFCFA(margin)}</div>
              <div className="mp">
                {t('ui.products.margin_on_display', { pct: marginPct, price: fmtFCFA(display) })}
              </div>
            </div>

            <div className="info-card">
              <div className="between" style={{ marginBottom: 14 }}>
                <h4 style={{ margin: 0 }}>{t('ui.products.pricing')}</h4>
                <span className="note">{t('ui.products.pricing_note')}</span>
              </div>
              <div className="kv-line">
                <span className="k">{t('ui.products.display_price')}</span>
                <span className="v num">{fmtFCFA(display)}</span>
              </div>
              <div className="price-breakdown">
                {t('ui.products.price_breakdown', { ht: fmtFCFA(ht), tva: fmtFCFA(display - ht) })}
              </div>
              <div className="kv-line">
                <span className="k">{t('ui.products.floor_price')}</span>
                <span className="v num">{fmtFCFA(floor)}</span>
              </div>
              <div className="kv-line">
                <span className="k">{t('ui.products.cost_price')}</span>
                <span className="v num">{fmtFCFA(cost)}</span>
              </div>
              <div className="divider" style={{ margin: '10px 0 4px' }} />
              <div className="kv-line">
                <span className="k">{t('ui.products.floor_margin')}</span>
                <span className={`v num${floorBelowCost ? '' : ' accent'}`}>{fmtFCFA(floorMargin)}</span>
              </div>
              {floorBelowCost && (
                <div className="note" style={{ color: 'var(--st-urgent)', marginTop: 4 }}>
                  {t('ui.products.floor_below_cost')}
                </div>
              )}
            </div>

            <div className="info-card">
              <h4>{t('ui.products.catalog')}</h4>
              <div className="kv-line">
                <span className="k">{t('ui.products.category')}</span>
                <span className="v">{p.category?.name?.fr ?? '—'}</span>
              </div>
              <div className="kv-line">
                <span className="k">{t('ui.products.production')}</span>
                <span className="v">{PRODTYPE[p.productionType] ? t(PRODTYPE[p.productionType]!) : p.productionType}</span>
              </div>
              <div className="kv-line">
                <span className="k">{t('ui.products.commission')}</span>
                <span className="v">
                  {String(p.defaultCommissionValue)}
                  {p.defaultCommissionType === 'PERCENTAGE' ? ' %' : ' FCFA'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CelvaSkin>
  );
};
