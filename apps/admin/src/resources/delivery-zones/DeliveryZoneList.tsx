import { Title, useGetList, useRedirect, useTranslate } from 'react-admin';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import type { DeliveryZone } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA } from '../orders/orderSkin';
import './delivery-zones.css';

const num = (v: string | number | null | undefined): number => Number(v ?? 0);

const estimatedLabel = (z: DeliveryZone): string => {
  if (!z.estimatedDays) return 'Délai non précisé';
  const { min, max } = z.estimatedDays;
  return min === max ? `${min} j` : `${min}–${max} j`;
};

export const DeliveryZoneList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const { data, isLoading } = useGetList<DeliveryZone>('delivery-zones', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'id', order: 'ASC' },
  });

  const zones = data ?? [];

  return (
    <CelvaSkin>
      <Title title={t('resources.delivery-zones.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="between" style={{ marginBottom: 16, alignItems: 'flex-start', gap: 12 }}>
          <div style={{ maxWidth: '52ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              Zones de livraison
            </div>
            <div className="note">
              Frais facturés au client, coût réel et marge par zone. Une marge négative est un choix
              stratégique — rendue visible ici. Le coût réel reste interne.
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => redirect('create', 'delivery-zones')}
          >
            <AddIcon sx={{ fontSize: 16 }} /> Zone
          </button>
        </div>

        {zones.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<LocalShippingIcon sx={{ fontSize: 40 }} />}
              title={isLoading ? t('ra.page.loading') : 'Aucune zone de livraison'}
              sub={isLoading ? undefined : 'Créez votre première zone pour facturer la livraison.'}
            />
          </div>
        ) : (
          <div className="list-wrap">
            {zones.map((z) => {
              const fee = num(z.fee);
              const cost = num(z.actualCost);
              const margin = fee - cost;
              const mClass = margin < 0 ? 'neg' : margin === 0 ? 'zero' : 'pos';
              const threshold = z.freeDeliveryThreshold;
              return (
                <div
                  key={z.id}
                  className={`lrow dz${z.isActive ? '' : ' off'}`}
                  onClick={() => redirect('edit', 'delivery-zones', z.id)}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="lname">
                      {z.name?.fr}
                      {z.name?.en && <span className="dz-en">{z.name.en}</span>}
                    </div>
                    <div className="lsub">
                      <span>
                        {threshold != null && num(threshold) > 0
                          ? `Offerte dès ${fmtFCFA(threshold)}`
                          : 'Jamais offerte'}
                      </span>
                    </div>
                  </div>

                  <div className="lcell">
                    <div className="lc-v">{fmtFCFA(fee)}</div>
                    <div className="dz-cost">
                      {fmtFCFA(cost)}
                      <span className="dz-int">interne</span>
                    </div>
                    <div className={`dz-margin ${mClass}`}>
                      {margin > 0 ? '+ ' : margin < 0 ? '− ' : ''}
                      {fmtFCFA(Math.abs(margin))} marge
                    </div>
                  </div>

                  <div className="dz-sub-col" style={{ minWidth: 0 }}>
                    <div className="lsub">
                      <span>{estimatedLabel(z)}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`pill ${z.isActive ? 's-done' : 's-neutral'}`}>
                      <span className="pdot" />
                      {z.isActive ? 'Active' : 'Inactive'}
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
