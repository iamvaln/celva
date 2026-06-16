import { useMemo } from 'react';
import { Title, useGetList, useRedirect, useTranslate } from 'react-admin';
import GroupsIcon from '@mui/icons-material/Groups';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fmtFCFA } from '../orders/orderSkin';
import './partners.css';

type PartnerCapital = {
  id: string;
  name: string;
  email?: string | null;
  equityShare?: string | number | null;
  isActive: boolean;
  contributed: string;
  withdrawn: string;
  netCapital: string;
};

export const PartnerList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const { data = [], isLoading } = useGetList<PartnerCapital>('partners', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'createdAt', order: 'ASC' },
  });

  const totalNet = useMemo(
    () => data.reduce((s, p) => s + Number(p.netCapital), 0),
    [data],
  );

  return (
    <CelvaSkin>
      <Title title={t('ui.partners.title')} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="between" style={{ alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 14 }}>
          <div style={{ maxWidth: '52ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              {t('ui.partners.title')}
            </div>
            <div className="note">{t('ui.partners.intro')}</div>
          </div>
          <button className="btn btn-primary" onClick={() => redirect('create', 'partners')}>
            ＋ {t('ui.partners.add')}
          </button>
        </div>

        {/* Capital net total */}
        <div className="treasury-total" style={{ marginBottom: 22 }}>
          <span className="section-label" style={{ margin: 0 }}>
            {t('ui.partners.total_net')}
          </span>
          <span className="tt-v num">{fmtFCFA(totalNet)}</span>
        </div>

        {data.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<GroupsIcon sx={{ fontSize: 52 }} />}
              title={isLoading ? t('ra.page.loading') : t('ui.partners.empty')}
              sub={t('ui.partners.empty_sub')}
            />
          </div>
        ) : (
          <div className="partner-grid">
            {data.map((p) => (
              <button
                key={p.id}
                className={`partner-card${p.isActive ? '' : ' off'}`}
                onClick={() => redirect('edit', 'partners', p.id)}
              >
                <div className="between" style={{ alignItems: 'flex-start' }}>
                  <div className="pa-avatar">
                    {p.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  {p.equityShare != null && (
                    <span className="pa-share num">{Number(p.equityShare)}%</span>
                  )}
                </div>
                <div className="pa-name">{p.name}</div>
                {p.email && <div className="pa-email">{p.email}</div>}

                <div className="pa-net num">{fmtFCFA(p.netCapital)}</div>
                <div className="pa-net-l">{t('ui.partners.net_capital')}</div>

                <div className="pa-rows">
                  <div className="pa-row">
                    <span>{t('ui.partners.contributed')}</span>
                    <span className="num pa-in">+ {fmtFCFA(p.contributed)}</span>
                  </div>
                  <div className="pa-row">
                    <span>{t('ui.partners.withdrawn')}</span>
                    <span className="num pa-out">− {fmtFCFA(p.withdrawn)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
