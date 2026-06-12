import { Title, useGetList, useRedirect, useTranslate } from 'react-admin';
import AddIcon from '@mui/icons-material/Add';
import StraightenIcon from '@mui/icons-material/Straighten';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { SizeGuide } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';

export const SizeGuideList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const { data = [], isLoading } = useGetList<SizeGuide>('size-guides', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'categoryId', order: 'ASC' },
  });

  return (
    <CelvaSkin>
      <Title title={t('resources.size-guides.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="between" style={{ marginBottom: 16, alignItems: 'flex-start', gap: 12 }}>
          <div style={{ maxWidth: '52ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              {t('resources.size-guides.name', { smart_count: 2 })}
            </div>
            <div className="note">{t('resources.size-guides.hint')}</div>
          </div>
          <button className="btn btn-primary" onClick={() => redirect('create', 'size-guides')}>
            <AddIcon sx={{ fontSize: 16 }} /> {t('resources.size-guides.add')}
          </button>
        </div>

        {data.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<StraightenIcon sx={{ fontSize: 40 }} />}
              title={isLoading ? t('ra.page.loading') : t('resources.size-guides.empty')}
            />
          </div>
        ) : (
          <div className="list-wrap">
            {data.map((g) => (
              <div
                key={g.id}
                className="lrow"
                style={{ gridTemplateColumns: '40px 1fr auto 22px' }}
                onClick={() => redirect('edit', 'size-guides', g.id)}
              >
                <div className="cover-thumb" style={{ width: 40, height: 40 }}>
                  <StraightenIcon sx={{ fontSize: 18 }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="lname">{g.name?.fr ?? '—'}</div>
                  {g.name?.en && <div className="lsub">{g.name.en}</div>}
                </div>
                <div className="lcell">
                  <div className="lc-l" style={{ marginTop: 0 }}>
                    {t('resources.size-guides.fields.category')}
                  </div>
                  <div className="lname" style={{ fontSize: 15 }}>
                    {g.category?.name?.fr ?? '—'}
                  </div>
                </div>
                <div className="lchev">
                  <ChevronRightIcon sx={{ fontSize: 18 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
