import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Title, useGetList, useGetOne, useNotify, useRedirect, useTranslate } from 'react-admin';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import PrintIcon from '@mui/icons-material/Print';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import type { AdminOrderDetail, RawMaterial } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import { CelvaSkin } from '../../components/CelvaSkin';
import { fmtFCFA } from './orderSkin';

type Line = { key: string; name: string; variant: string; sku: string; loc?: string | null };

export const OrderPrepScreen = () => {
  const { id } = useParams();
  const t = useTranslate();
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

  const nChecked = Object.values(checked).filter(Boolean).length;
  const allChecked = lines.length > 0 && nChecked === lines.length;
  const packCost = materials.reduce((s, m) => s + (pack[m.id] ?? 0) * Number(m.unitPrice), 0);
  const setQty = (mid: string, q: number) => setPack((p) => ({ ...p, [mid]: Math.max(0, q) }));

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
      <Title title="Préparation" />
      <div className="fade-in" style={{ padding: '8px 4px 64px', maxWidth: 920 }}>
        <button className="back-link" style={{ marginBottom: 14 }} onClick={back}>
          <ArrowBackIcon sx={{ fontSize: 16 }} /> {order.orderNumber}
        </button>
        <div className="flow-head">
          <div className="flow-title">Bon de préparation</div>
        </div>
        <div className="dh-meta" style={{ marginBottom: 22 }}>
          <span>{order.user.name}</span>
          <span>·</span>
          <span>{lines.length} article(s)</span>
          <span>·</span>
          <span>{fmtFCFA(order.total)}</span>
        </div>

        {/* Pick checklist */}
        <div className="between" style={{ marginBottom: 12 }}>
          <div className="section-label" style={{ margin: 0 }}>
            Articles à rassembler
          </div>
          <div className="row" style={{ gap: 14 }}>
            <div className="prep-counter num">
              <span className={nChecked ? 'done-n' : ''}>{nChecked}</span> / {lines.length} rassemblés
            </div>
            <button className="btn btn-ghost" onClick={() => window.print()}>
              <PrintIcon sx={{ fontSize: 15 }} /> Imprimer le bon
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
                <div className="lbl">Emplacement</div>
                <div className="val">{l.loc || 'Magasin'}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Packaging picker */}
        <div className="section-label">Emballage utilisé</div>
        <div className="card" style={{ marginBottom: 14 }}>
          {materials.length === 0 ? (
            <div className="pack-row note">Aucune matière d’emballage configurée.</div>
          ) : (
            materials.map((m) => (
              <div key={m.id} className="pack-row">
                <div className="pkname">
                  <div style={{ fontSize: 15.5 }}>{m.name}</div>
                  <div className="pkstock">
                    Stock {String(m.stockQty)} {m.unit} · {fmtFCFA(m.unitPrice)}/{m.unit}
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
          <span className="nl">Coût d’emballage · déduit du stock à la validation</span>
          <span className="nv num">{fmtFCFA(packCost)}</span>
        </div>

        <div className="between">
          <span className="note">
            {allChecked ? 'Tous les articles sont rassemblés.' : 'Cochez tous les articles pour activer.'}
          </span>
          <button className="btn btn-primary btn-lg" disabled={!allChecked || busy} onClick={markReady}>
            Marquer prête
          </button>
        </div>
      </div>
    </CelvaSkin>
  );
};
