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

type Mode = { id: string; labelKey: string; tagKey?: string; icon: ReactNode; descKey: string };

const MODES: Mode[] = [
  {
    id: 'STAFF_DELIVERY',
    labelKey: 'ui.orders.route_mode_staff',
    tagKey: 'ui.orders.route_tag_default',
    icon: <LocalShippingIcon sx={{ fontSize: 20 }} />,
    descKey: 'ui.orders.route_mode_staff_desc',
  },
  {
    id: 'HOME_DELIVERY',
    labelKey: 'ui.orders.route_mode_external',
    icon: <PersonIcon sx={{ fontSize: 20 }} />,
    descKey: 'ui.orders.route_mode_external_desc',
  },
  {
    id: 'STORE_PICKUP',
    labelKey: 'ui.orders.route_mode_pickup',
    icon: <StoreIcon sx={{ fontSize: 20 }} />,
    descKey: 'ui.orders.route_mode_pickup_desc',
  },
  {
    id: 'RELAY_PICKUP',
    labelKey: 'ui.orders.route_mode_relay',
    icon: <AccessTimeIcon sx={{ fontSize: 20 }} />,
    descKey: 'ui.orders.route_mode_relay_desc',
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
      notify(t('ui.orders.route_no_delivery'), { type: 'error' });
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
      <Title title={t('ui.orders.route_title')} />
      <div className="fade-in" style={{ padding: '8px 4px 64px', maxWidth: 920 }}>
        <button className="back-link" style={{ marginBottom: 14 }} onClick={back}>
          <ArrowBackIcon sx={{ fontSize: 16 }} /> {order.orderNumber}
        </button>
        <div className="flow-head">
          <div className="flow-title">{t('ui.orders.route_title')}</div>
        </div>
        <div className="dh-meta" style={{ marginBottom: 22 }}>
          <span>{order.user.name}</span>
          <span>·</span>
          <span>{fmtFCFA(order.total)}</span>
        </div>

        <div className="section-label">{t('ui.orders.route_mode_label')}</div>
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
                  <span className="mtitle">{t(m.labelKey)}</span>
                  {m.tagKey && <span className="mtag">{t(m.tagKey)}</span>}
                </div>
                <div className="mdesc">{t(m.descKey)}</div>
              </div>
            </button>
          ))}
        </div>

        {isDelivery && (
          <div className="card card-pad" style={{ marginBottom: 22 }}>
            <div className="section-label">{isStaff ? t('ui.orders.route_mode_staff') : t('ui.orders.route_external_title')}</div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div className="field">
                  <label>{isStaff ? t('ui.orders.route_who_delivers') : t('ui.orders.route_assigned_deliverer')}</label>
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
                  <label>{t('ui.orders.route_fee_charged')}</label>
                  <input type="number" value={fee} readOnly />
                </div>
                <div className="field">
                  <label>
                    {isStaff
                      ? t('ui.orders.route_real_cost_staff')
                      : t('ui.orders.route_real_cost_external')}
                  </label>
                  <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
                </div>
              </div>
              <div>
                {isStaff && (
                  <>
                    <div className="field">
                      <label>{t('ui.orders.route_receipt')}</label>
                      <input
                        type="text"
                        value={receipt}
                        onChange={(e) => setReceipt(e.target.value)}
                        placeholder="recu-course.jpg"
                      />
                    </div>
                    <div className="field">
                      <label>{t('ui.orders.route_account')}</label>
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
                    <div className="nl">{t('ui.orders.route_net')}</div>
                    <div className="note" style={{ marginTop: 2 }}>
                      {t('ui.orders.route_net_breakdown', { fee: fmtFCFA(fee), cost: fmtFCFA(costNum) })}
                    </div>
                  </div>
                  <span className={`nv num ${net >= 0 ? 'net-pos' : 'net-neg'}`}>
                    {net >= 0 ? '+ ' : '− '}
                    {fmtFCFA(Math.abs(net))}
                  </span>
                </div>
                {isStaff && costNum > 0 && (
                  <div className="callout" style={{ marginTop: 14 }}>
                    {t('ui.orders.route_callout_prefix')}{' '}
                    <strong>{t('ui.orders.route_callout_tx')}</strong>{' '}
                    {t('ui.orders.route_callout_suffix', { amount: fmtFCFA(costNum) })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="between">
          <span className="note">
            {isStaff
              ? t('ui.orders.route_hint_staff')
              : isExternal
                ? t('ui.orders.route_hint_external')
                : t('ui.orders.route_hint_pickup')}
          </span>
          <button className="btn btn-primary btn-lg" disabled={busy} onClick={submit}>
            {isStaff
              ? t('ui.orders.route_submit_staff')
              : isExternal
                ? t('ui.orders.route_submit_external')
                : t('ui.orders.route_submit_pickup')}
          </button>
        </div>
      </div>
    </CelvaSkin>
  );
};
