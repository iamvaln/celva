import './deliveries.css';
import { useMemo, useState } from 'react';
import { Title, useGetList, useRedirect, useTranslate } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PlaceIcon from '@mui/icons-material/Place';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Delivery } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA, relativeFr } from '../orders/orderSkin';

type DeliveryStatus = Delivery['status'];
type DeliveryMode = Delivery['mode'];

/** Status → translation key + design status-class (color binding in celva-skin.css). */
const STATUS_SKIN: Record<DeliveryStatus, { key: string; sc: string }> = {
  PENDING: { key: 'status_pending', sc: 's-todo' },
  ASSIGNED: { key: 'status_assigned', sc: 's-todo' },
  PICKED_UP: { key: 'status_picked_up', sc: 's-info' },
  IN_TRANSIT: { key: 'status_in_transit', sc: 's-info' },
  DELIVERED: { key: 'status_delivered', sc: 's-done' },
  FAILED: { key: 'status_failed', sc: 's-urgent' },
};

const MODE_KEY: Record<DeliveryMode, string> = {
  HOME_DELIVERY: 'mode_home_delivery',
  STAFF_DELIVERY: 'mode_staff_delivery',
  STORE_PICKUP: 'mode_store_pickup',
  RELAY_PICKUP: 'mode_relay_pickup',
};

const isPickup = (mode: DeliveryMode): boolean =>
  mode === 'STORE_PICKUP' || mode === 'RELAY_PICKUP';

type Tab = { id: string; key: string; sc: string; match: (d: Delivery) => boolean };

const TABS: Tab[] = [
  {
    id: 'arrange',
    key: 'tab_arrange',
    sc: 's-todo',
    match: (d) => d.status === 'PENDING' || d.status === 'ASSIGNED',
  },
  {
    id: 'transit',
    key: 'tab_transit',
    sc: 's-info',
    match: (d) => d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT',
  },
  { id: 'delivered', key: 'tab_delivered', sc: 's-done', match: (d) => d.status === 'DELIVERED' },
  { id: 'failed', key: 'tab_failed', sc: 's-urgent', match: (d) => d.status === 'FAILED' },
  { id: 'all', key: 'tab_all', sc: 's-neutral', match: () => true },
];

const StatusPill = ({ status }: { status: DeliveryStatus }) => {
  const t = useTranslate();
  const s = STATUS_SKIN[status];
  return (
    <span className={`pill ${s.sc}`}>
      <span className="pdot" />
      {t('ui.deliveries.' + s.key)}
    </span>
  );
};

const ModeIcon = ({ mode }: { mode: DeliveryMode }) => {
  if (mode === 'STORE_PICKUP') return <StorefrontIcon sx={{ fontSize: 18 }} />;
  if (mode === 'RELAY_PICKUP') return <PlaceIcon sx={{ fontSize: 18 }} />;
  return <LocalShippingIcon sx={{ fontSize: 18 }} />;
};

const eventDate = (d: Delivery): string =>
  d.deliveredAt ?? d.pickedUpAt ?? d.assignedAt ?? d.createdAt;

const DeliveryRow = ({ d, onOpen }: { d: Delivery; onOpen: (id: string) => void }) => {
  const t = useTranslate();
  const sc = STATUS_SKIN[d.status].sc;
  const city = d.order.shippingCity ?? d.pickupPoint?.city ?? null;
  const pickup = isPickup(d.mode);
  return (
    <div className={`lrow dlv ${sc}`} onClick={() => onOpen(d.id)}>
      <div className="obar" />
      <div className="dlv-ic">
        {d.status === 'FAILED' ? (
          <ErrorOutlineIcon sx={{ fontSize: 18 }} />
        ) : (
          <ModeIcon mode={d.mode} />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="dlv-head">
          <span className="lname">{d.order.orderNumber}</span>
          {d.mode === 'STAFF_DELIVERY' && (
            <span className="dlv-tag">{t('ui.deliveries.tag_staff')}</span>
          )}
          {pickup && <span className="dlv-tag">{t('ui.deliveries.tag_pickup')}</span>}
        </div>
        <div className="lsub">
          <span>{t('ui.deliveries.' + MODE_KEY[d.mode])}</span>
          {city && (
            <>
              <span>·</span>
              <span>{city}</span>
            </>
          )}
          <span>·</span>
          <span>{d.order.user.name}</span>
        </div>
      </div>
      <div />
      <div className="lcell dlv-cost">
        <div className="lc-v num">{fmtFCFA(d.actualCost)}</div>
        <div className="lc-l">{relativeFr(eventDate(d), t)}</div>
      </div>
      <div className="lchev">
        <StatusPill status={d.status} />
        <ChevronRightIcon sx={{ fontSize: 18, marginLeft: '8px' }} />
      </div>
    </div>
  );
};

export const DeliveryList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const [tab, setTab] = useState<string>('arrange');
  const [q, setQ] = useState('');

  const { data: deliveries = [], isLoading } = useGetList<Delivery>('deliveries', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'createdAt', order: 'DESC' },
  });

  const open = (id: string) => redirect('show', 'deliveries', id);

  const inProgress = useMemo(
    () =>
      deliveries.filter(
        (d) =>
          d.status === 'PENDING' ||
          d.status === 'ASSIGNED' ||
          d.status === 'PICKED_UP' ||
          d.status === 'IN_TRANSIT',
      ).length,
    [deliveries],
  );

  const rows = useMemo(() => {
    const tabDef = TABS.find((tt) => tt.id === tab) ?? TABS[0]!;
    let r = deliveries.filter(tabDef.match);
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter((d) => {
        const city = d.order.shippingCity ?? d.pickupPoint?.city ?? '';
        return (
          d.order.orderNumber.toLowerCase().includes(qq) || city.toLowerCase().includes(qq)
        );
      });
    }
    return r;
  }, [deliveries, tab, q]);

  return (
    <CelvaSkin>
      <Title title={t('resources.deliveries.name', { smart_count: 2 })} />
      <div style={{ padding: '8px 4px 64px' }} className="fade-in">
        <div
          className="toolbar"
          style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <div style={{ maxWidth: '52ch' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--fg-strong)',
              }}
            >
              {t('ui.deliveries.heading')}
            </div>
            <div className="note" style={{ marginTop: 4 }}>
              {t('ui.deliveries.subtitle')}
            </div>
          </div>
          <span className="note">
            {t('ui.deliveries.in_progress_count', { n: inProgress })}
          </span>
        </div>

        <div className="tabs">
          {TABS.map((tt) => {
            const count = deliveries.filter(tt.match).length;
            return (
              <button
                key={tt.id}
                className={`tab${tt.id === tab ? ' active' : ''}`}
                onClick={() => setTab(tt.id)}
              >
                {t('ui.deliveries.' + tt.key)}
                <span className="tcount num">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="subfilters">
          <div className="search" style={{ minWidth: 220 }}>
            <SearchIcon />
            <input
              placeholder={t('ui.deliveries.search_placeholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<LocalShippingIcon sx={{ fontSize: 52 }} />}
            title={
              isLoading ? t('ra.page.loading') : t('ui.deliveries.empty_title')
            }
            sub={
              isLoading || q.trim() || tab !== 'all'
                ? undefined
                : t('ui.deliveries.empty_sub')
            }
          />
        ) : (
          <div className="list-wrap">
            {rows.map((d) => (
              <DeliveryRow key={d.id} d={d} onOpen={open} />
            ))}
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
