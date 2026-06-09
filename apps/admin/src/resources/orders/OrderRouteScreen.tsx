import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Title, useGetList, useGetOne, useNotify, useRedirect, useTranslate } from 'react-admin';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonIcon from '@mui/icons-material/Person';
import StoreIcon from '@mui/icons-material/Store';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { AdminOrderDetail, AdminUser, PaymentAccount } from '../../types';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';
import { CelvaSkin } from '../../components/CelvaSkin';
import { fmtFCFA } from './orderSkin';

type Mode = { id: string; label: string; tag?: string; icon: ReactNode; desc: string };

const MODES: Mode[] = [
  {
    id: 'STAFF_DELIVERY',
    label: "Livraison par l'équipe",
    tag: 'Défaut',
    icon: <LocalShippingIcon sx={{ fontSize: 20 }} />,
    desc: "Un membre de l'équipe livre. Frais de course + reçu, suivi géré ici.",
  },
  {
    id: 'HOME_DELIVERY',
    label: 'Confier à un livreur',
    icon: <PersonIcon sx={{ fontSize: 20 }} />,
    desc: "Livreur externe, suivi via l'app livreur. Coût payé au livreur.",
  },
  {
    id: 'STORE_PICKUP',
    label: 'Retrait magasin',
    icon: <StoreIcon sx={{ fontSize: 20 }} />,
    desc: 'La cliente vient retirer. Aucun frais, notifiée « prête à retirer ».',
  },
  {
    id: 'RELAY_PICKUP',
    label: 'Point relais',
    icon: <AccessTimeIcon sx={{ fontSize: 20 }} />,
    desc: 'Dépôt en point relais. Coût configurable, cliente notifiée.',
  },
];

export const OrderRouteScreen = () => {
  const { id } = useParams();
  const t = useTranslate();
  const redirect = useRedirect();
  const notify = useNotify();
  const { data: order, isLoading } = useGetOne<AdminOrderDetail>('orders', { id: id! });
  const { data: users = [] } = useGetList<AdminUser>('users', {
    pagination: { page: 1, perPage: 50 },
    sort: { field: 'name', order: 'ASC' },
  });
  const { data: accounts = [] } = useGetList<PaymentAccount>('payment-accounts', {
    pagination: { page: 1, perPage: 50 },
    sort: { field: 'createdAt', order: 'ASC' },
  });

  const [mode, setMode] = useState('STAFF_DELIVERY');
  const [delivererId, setDelivererId] = useState('');
  const [cost, setCost] = useState('');
  const [receipt, setReceipt] = useState('');
  const [accountId, setAccountId] = useState('');
  const [busy, setBusy] = useState(false);

  const fee = order ? Number(order.deliveryFee) : 0;
  useEffect(() => {
    if (order) setCost(String(Number(order.deliveryFee) || 0));
  }, [order]);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.isActive), [accounts]);

  if (isLoading || !order) {
    return (
      <CelvaSkin>
        <div style={{ padding: 24 }} className="note">
          {t('ra.page.loading')}
        </div>
      </CelvaSkin>
    );
  }

  const isStaff = mode === 'STAFF_DELIVERY';
  const isExternal = mode === 'HOME_DELIVERY';
  const isDelivery = isStaff || isExternal;
  const costNum = cost === '' ? 0 : Number(cost);
  const net = fee - costNum;
  const back = () => redirect('show', 'orders', order.id);

  const submit = async () => {
    const deliveryId = order.delivery?.id;
    if (!deliveryId) {
      notify('Cette commande n’a pas de livraison.', { type: 'error' });
      return;
    }
    try {
      setBusy(true);
      await fetchJson(`${API_BASE}/deliveries/${deliveryId}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          mode,
          delivererId: isDelivery && delivererId ? delivererId : undefined,
          actualCost: isDelivery ? costNum : undefined,
          receiptUrl: isStaff && receipt.trim() ? receipt.trim() : undefined,
          paymentAccountId: isStaff && accountId ? accountId : undefined,
        }),
      });
      notify('resources.orders.route.done', { type: 'success' });
      back();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), { type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <CelvaSkin>
      <Title title="Acheminement" />
      <div className="fade-in" style={{ padding: '8px 4px 64px', maxWidth: 920 }}>
        <button className="back-link" style={{ marginBottom: 14 }} onClick={back}>
          <ArrowBackIcon sx={{ fontSize: 16 }} /> {order.orderNumber}
        </button>
        <div className="flow-head">
          <div className="flow-title">Acheminement</div>
        </div>
        <div className="dh-meta" style={{ marginBottom: 22 }}>
          <span>{order.user.name}</span>
          <span>·</span>
          <span>{fmtFCFA(order.total)}</span>
        </div>

        <div className="section-label">Mode d’acheminement</div>
        <div className="mode-grid" style={{ marginBottom: 26 }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`mode-card${mode === m.id ? ' sel' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <span className="micon">{m.icon}</span>
              <div>
                <div>
                  <span className="mtitle">{m.label}</span>
                  {m.tag && <span className="mtag">{m.tag}</span>}
                </div>
                <div className="mdesc">{m.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {isDelivery && (
          <div className="card card-pad" style={{ marginBottom: 22 }}>
            <div className="section-label">{isStaff ? "Livraison par l'équipe" : 'Livreur externe'}</div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div className="field">
                  <label>{isStaff ? 'Qui livre' : 'Livreur assigné'}</label>
                  <select value={delivererId} onChange={(e) => setDelivererId(e.target.value)}>
                    <option value="">—</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Frais facturés à la cliente (FCFA)</label>
                  <input type="number" value={fee} readOnly />
                </div>
                <div className="field">
                  <label>
                    {isStaff
                      ? 'Frais de course réels — taxi, carburant (FCFA)'
                      : 'Coût payé au livreur (FCFA)'}
                  </label>
                  <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
                </div>
              </div>
              <div>
                {isStaff && (
                  <>
                    <div className="field">
                      <label>Reçu de course (URL / référence)</label>
                      <input
                        type="text"
                        value={receipt}
                        onChange={(e) => setReceipt(e.target.value)}
                        placeholder="recu-course.jpg"
                      />
                    </div>
                    <div className="field">
                      <label>Compte (dépense de course)</label>
                      <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                        <option value="">—</option>
                        {activeAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} · {a.type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div className="net-box">
                  <div>
                    <div className="nl">Net livraison</div>
                    <div className="note" style={{ marginTop: 2 }}>
                      Facturé {fmtFCFA(fee)} − coût {fmtFCFA(costNum)}
                    </div>
                  </div>
                  <span className={`nv num ${net >= 0 ? 'net-pos' : 'net-neg'}`}>
                    {net >= 0 ? '+ ' : '− '}
                    {fmtFCFA(Math.abs(net))}
                  </span>
                </div>
                {isStaff && costNum > 0 && (
                  <div className="callout" style={{ marginTop: 14 }}>
                    Une transaction <strong>Dépense · Livraison</strong> de {fmtFCFA(costNum)} sera
                    générée à la validation.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="between">
          <span className="note">
            {isStaff
              ? 'Suivi géré dans l’admin — boutons « en route » / « livrée » sur la livraison.'
              : isExternal
                ? 'Suivi via l’app livreur.'
                : 'La cliente sera notifiée automatiquement.'}
          </span>
          <button className="btn btn-primary btn-lg" disabled={busy} onClick={submit}>
            {isStaff
              ? 'Confirmer & marquer en route'
              : isExternal
                ? 'Confier au livreur'
                : 'Notifier la cliente'}
          </button>
        </div>
      </div>
    </CelvaSkin>
  );
};
