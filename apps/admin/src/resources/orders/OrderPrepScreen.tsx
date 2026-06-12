import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Title,
  useGetList,
  useGetOne,
  useLocaleState,
  useNotify,
  useRedirect,
  useTranslate,
} from 'react-admin';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import PrintIcon from '@mui/icons-material/Print';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import type { AdminOrderDetail, RawMaterial } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import { CelvaSkin } from '../../components/CelvaSkin';
import { CelvaMonogram } from '../../components/CelvaMonogram';
import { fmtFCFA } from './orderSkin';
import './prep-print.css';

type Line = { key: string; name: string; variant: string; sku: string; loc?: string | null };

/** One printable row per order line (with its quantity), for the A4 slip. */
type SlipRow = { key: string; name: string; variant: string; sku: string; loc?: string | null; qty: number };

/**
 * Slip-only bilingual strings. The shared interactive labels live under
 * `ui.orders.prep_*` (i18nUi.ts), but those translation files are owned by
 * other modules and must not be edited here, so the print-sheet copy is kept
 * locally under the `ui.prepslip` namespace and resolved by the active locale.
 */
const PREPSLIP_STRINGS = {
  fr: {
    doc: 'Bon de préparation',
    items: 'Articles à rassembler',
    pieces: 'pièces',
    col_article: 'Article',
    col_location: 'Emplacement',
    col_qty: 'Qté',
    packaging: 'Emballage',
    prepared_by: 'Préparé par',
    datetime: 'Date & heure',
    store: 'Magasin',
  },
  en: {
    doc: 'Preparation slip',
    items: 'Items to gather',
    pieces: 'pieces',
    col_article: 'Article',
    col_location: 'Location',
    col_qty: 'Qty',
    packaging: 'Packaging',
    prepared_by: 'Prepared by',
    datetime: 'Date & time',
    store: 'Store',
  },
} as const;

export const OrderPrepScreen = () => {
  const { id } = useParams();
  const t = useTranslate();
  const [locale] = useLocaleState();
  const redirect = useRedirect();
  const notify = useNotify();
  const { data: order, isLoading } = useGetOne<AdminOrderDetail>('orders', { id: id! });
  const { data: materials = [] } = useGetList<RawMaterial>('raw-materials', {
    filter: { type: 'PACKAGING' },
    sort: { field: 'name', order: 'ASC' },
    pagination: { page: 1, perPage: 100 },
  });

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [pack, setPack] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  // One pickable line per unit (a qty-2 item is two lines to gather).
  const lines: Line[] = useMemo(() => {
    if (!order) return [];
    return order.items
      .filter((it) => it.variant)
      .flatMap((it, idx) =>
        Array.from({ length: it.quantity }, (_, k) => ({
          key: `${idx}-${k}`,
          name: it.variant.product?.name?.fr ?? it.variant.sku,
          variant: it.variant.sku,
          sku: it.variant.sku,
          loc: it.variant.storageLocation,
        })),
      );
  }, [order]);

  // One printable row per order line (keeps the quantity instead of expanding
  // to one row per unit, so the A4 slip stays compact).
  const slipRows: SlipRow[] = useMemo(() => {
    if (!order) return [];
    return order.items
      .filter((it) => it.variant)
      .map((it, idx) => ({
        key: `r-${idx}`,
        name: it.variant.product?.name?.[locale === 'en' ? 'en' : 'fr'] ?? it.variant.sku,
        variant: it.variant.sku,
        sku: it.variant.sku,
        loc: it.variant.storageLocation,
        qty: it.quantity,
      }));
  }, [order, locale]);

  const nChecked = Object.values(checked).filter(Boolean).length;
  const allChecked = lines.length > 0 && nChecked === lines.length;
  const packCost = materials.reduce((s, m) => s + (pack[m.id] ?? 0) * Number(m.unitPrice), 0);
  const setQty = (mid: string, q: number) => setPack((p) => ({ ...p, [mid]: Math.max(0, q) }));

  // Packaging actually counted in by the preparer (qty > 0), for the slip summary.
  const slipPackaging = materials.filter((m) => (pack[m.id] ?? 0) > 0);
  const totalUnits = lines.length;
  const slip = PREPSLIP_STRINGS[locale === 'en' ? 'en' : 'fr'];

  if (isLoading || !order) {
    return (
      <CelvaSkin>
        <div style={{ padding: 24 }} className="note">
          {t('ra.page.loading')}
        </div>
      </CelvaSkin>
    );
  }

  const back = () => redirect('show', 'orders', order.id);

  const markReady = async () => {
    const deliveryId = order.delivery?.id;
    try {
      setBusy(true);
      if (deliveryId) {
        for (const m of materials) {
          const q = pack[m.id] ?? 0;
          if (q > 0) {
            await fetchJson(`${API_BASE}/deliveries/${deliveryId}/packaging`, {
              method: 'POST',
              body: JSON.stringify({ rawMaterialId: m.id, quantity: q }),
            });
          }
        }
      }
      // Ensure we pass through PROCESSING before READY (deep-link safety).
      if (order.status === 'CONFIRMED') {
        await fetchJson(`${API_BASE}/orders/${order.id}/transition`, {
          method: 'POST',
          body: JSON.stringify({ status: 'PROCESSING' }),
        });
      }
      await fetchJson(`${API_BASE}/orders/${order.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ status: 'READY' }),
      });
      notify('resources.orders.prep.marked_ready', { type: 'success' });
      back();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <CelvaSkin>
      <Title title={t('ui.orders.prep_title')} />
      <div className="fade-in" style={{ padding: '8px 4px 64px', maxWidth: 920 }}>
        <button className="back-link" style={{ marginBottom: 14 }} onClick={back}>
          <ArrowBackIcon sx={{ fontSize: 16 }} /> {order.orderNumber}
        </button>
        <div className="flow-head">
          <div className="flow-title">{t('ui.orders.prep_slip')}</div>
        </div>
        <div className="dh-meta" style={{ marginBottom: 22 }}>
          <span>{order.user.name}</span>
          <span>·</span>
          <span>{t('ui.orders.item_count', { smart_count: lines.length })}</span>
          <span>·</span>
          <span>{fmtFCFA(order.total)}</span>
        </div>

        {/* Pick checklist */}
        <div className="between" style={{ marginBottom: 12 }}>
          <div className="section-label" style={{ margin: 0 }}>
            {t('ui.orders.prep_items_to_gather')}
          </div>
          <div className="row" style={{ gap: 14 }}>
            <div className="prep-counter num">
              <span className={nChecked ? 'done-n' : ''}>{nChecked}</span> {t('ui.orders.prep_gathered', { total: lines.length })}
            </div>
            <button className="btn btn-ghost" onClick={() => window.print()}>
              <PrintIcon sx={{ fontSize: 15 }} /> {t('ui.orders.prep_print')}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          {lines.map((l) => (
            <button
              key={l.key}
              className={`prep-item${checked[l.key] ? ' checked' : ''}`}
              onClick={() => setChecked((c) => ({ ...c, [l.key]: !c[l.key] }))}
            >
              <span className="pcheck">{checked[l.key] && <CheckIcon sx={{ fontSize: 17 }} />}</span>
              <span className="pthumb">
                <Inventory2Icon sx={{ fontSize: 18 }} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pname">{l.name}</div>
                <div className="psku">{l.sku}</div>
              </div>
              <div className="ploc">
                <div className="lbl">{t('ui.orders.prep_location')}</div>
                <div className="val">{l.loc || t('ui.orders.prep_store')}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Packaging picker */}
        <div className="section-label">{t('ui.orders.prep_packaging_used')}</div>
        <div className="card" style={{ marginBottom: 14 }}>
          {materials.length === 0 ? (
            <div className="pack-row note">{t('ui.orders.prep_no_packaging')}</div>
          ) : (
            materials.map((m) => (
              <div key={m.id} className="pack-row">
                <div className="pkname">
                  <div style={{ fontSize: 15.5 }}>{m.name}</div>
                  <div className="pkstock">
                    {t('ui.orders.prep_stock', { qty: String(m.stockQty), unit: m.unit })} · {fmtFCFA(m.unitPrice)}/{m.unit}
                  </div>
                </div>
                <div className="qty-step">
                  <button onClick={() => setQty(m.id, (pack[m.id] ?? 0) - 1)}>−</button>
                  <span className="qv num">{pack[m.id] ?? 0}</span>
                  <button onClick={() => setQty(m.id, (pack[m.id] ?? 0) + 1)}>+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="net-box" style={{ marginBottom: 26 }}>
          <span className="nl">{t('ui.orders.prep_packaging_cost')}</span>
          <span className="nv num">{fmtFCFA(packCost)}</span>
        </div>

        <div className="between">
          <span className="note">
            {allChecked ? t('ui.orders.prep_all_gathered') : t('ui.orders.prep_check_all')}
          </span>
          <button className="btn btn-primary btn-lg" disabled={!allChecked || busy} onClick={markReady}>
            {t('ui.orders.action_mark_ready')}
          </button>
        </div>
      </div>

      {/* Printable A4 preparation slip — hidden on screen, shown alone on print. */}
      <div className="prep-slip" aria-hidden>
        <div className="ps-head">
          <div className="ps-brand">
            <span className="ps-mono">
              <CelvaMonogram size={40} />
            </span>
            <div>
              <div className="ps-brand-name">Celva</div>
              <div className="ps-doc">{slip.doc}</div>
            </div>
          </div>
          <div className="ps-meta">
            <span className="ps-num">{order.orderNumber}</span>
            <br />
            {order.user.name}
            <br />
            {new Date(order.createdAt).toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR')}
          </div>
        </div>

        <div className="ps-section">
          {slip.items} · {totalUnits} {slip.pieces}
        </div>
        <table className="ps-table">
          <thead>
            <tr>
              <th className="c" style={{ width: 34 }}>
                {' '}
              </th>
              <th>{slip.col_article}</th>
              <th>{slip.col_location}</th>
              <th className="r" style={{ width: 50 }}>
                {slip.col_qty}
              </th>
            </tr>
          </thead>
          <tbody>
            {slipRows.map((r) => (
              <tr key={r.key} className="ps-row">
                <td className="c">
                  <span className="ps-box" />
                </td>
                <td>
                  <div className="ps-name">{r.name}</div>
                  <div className="ps-var">{r.variant}</div>
                  <div className="ps-sku">{r.sku}</div>
                </td>
                <td>
                  <span className="ps-loc">{r.loc || slip.store}</span>
                </td>
                <td className="r">
                  <span className="ps-qty">{r.qty}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {slipPackaging.length > 0 && (
          <>
            <div className="ps-section">{slip.packaging}</div>
            <div className="ps-pack">
              {slipPackaging.map((m) => (
                <div className="ps-pk" key={m.id}>
                  <span>{m.name}</span>
                  <span>× {pack[m.id]}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="ps-foot">
          <div className="ps-sig">
            <div className="ps-lbl">{slip.prepared_by}</div>
            <div className="ps-line" />
          </div>
          <div className="ps-sig">
            <div className="ps-lbl">{slip.datetime}</div>
            <div className="ps-line" />
          </div>
        </div>
      </div>
    </CelvaSkin>
  );
};
