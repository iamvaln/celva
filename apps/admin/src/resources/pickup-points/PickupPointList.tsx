import { Title, useGetList, useRedirect, useTranslate } from 'react-admin';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import StoreIcon from '@mui/icons-material/Store';
import PhoneIcon from '@mui/icons-material/Phone';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { PickupPoint } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import './pickup-points.css';

export const PickupPointList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const { data, isLoading } = useGetList<PickupPoint>('pickup-points', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'city', order: 'ASC' },
  });

  const points = data ?? [];

  return (
    <CelvaSkin>
      <Title title={t('resources.pickup-points.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="between" style={{ marginBottom: 16, alignItems: 'flex-start', gap: 12 }}>
          <div style={{ maxWidth: '52ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              Points de retrait
            </div>
            <div className="note">
              Boutique, pop-up et points relais où les clientes peuvent retirer leurs commandes.
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => redirect('create', 'pickup-points')}
          >
            <AddIcon sx={{ fontSize: 16 }} /> Point de retrait
          </button>
        </div>

        {points.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<StorefrontIcon sx={{ fontSize: 40 }} />}
              title={isLoading ? t('ra.page.loading') : 'Aucun point de retrait'}
              sub={
                isLoading ? undefined : 'Ajoutez un point relais ou votre boutique pour le retrait.'
              }
            />
          </div>
        ) : (
          <div className="list-wrap">
            {points.map((p) => {
              const hours = p.hours?.fr || p.hours?.en || '';
              return (
                <div
                  key={p.id}
                  className={`lrow pk${p.isActive ? '' : ' off'}`}
                  onClick={() => redirect('edit', 'pickup-points', p.id)}
                >
                  <div className="pk-ic">
                    <StoreIcon sx={{ fontSize: 17 }} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div className="lname">{p.name?.fr}</div>
                    <div className="lsub">
                      <span>
                        {[p.address, p.city].filter(Boolean).join(' · ')}
                      </span>
                      {p.phone && (
                        <>
                          <span>·</span>
                          <span className="pk-hours">
                            <PhoneIcon sx={{ fontSize: 13, color: 'var(--fg-muted)' }} />
                            {p.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pk-hours-col" style={{ minWidth: 0 }}>
                    {hours ? (
                      <div className="pk-hours">
                        <ScheduleIcon sx={{ fontSize: 13, color: 'var(--fg-muted)' }} />
                        {hours}
                      </div>
                    ) : (
                      <div className="pk-hours">Horaires non précisés</div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`pill ${p.isActive ? 's-done' : 's-neutral'}`}>
                      <span className="pdot" />
                      {p.isActive ? 'Actif' : 'Inactif'}
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
