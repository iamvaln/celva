import { useEffect, useRef, useState } from 'react';
import { Title, useGetList, useNotify, useRedirect, useRefresh, useTranslate } from 'react-admin';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CategoryIcon from '@mui/icons-material/Category';
import type { Category } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

export const CategoryList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const notify = useNotify();
  const refresh = useRefresh();
  const { data, isLoading } = useGetList<Category>('categories', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'sortOrder', order: 'ASC' },
  });

  // Local order mirror so drag feels instant; persisted on drop.
  const [cats, setCats] = useState<Category[]>([]);
  const dragId = useRef<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  useEffect(() => {
    if (data) setCats(data);
  }, [data]);

  const persist = async (ordered: Category[]) => {
    try {
      await fetchJson(`${API_BASE}/categories/reorder`, {
        method: 'POST',
        body: JSON.stringify({ ids: ordered.map((c) => c.id) }),
      });
      notify('resources.categories.notifications.reordered', { type: 'info' });
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), { type: 'error' });
      refresh();
    }
  };

  const onDrop = (toId: string) => {
    const from = dragId.current;
    setOverId(null);
    dragId.current = null;
    if (!from || from === toId) return;
    const arr = cats.slice();
    const fi = arr.findIndex((c) => c.id === from);
    const ti = arr.findIndex((c) => c.id === toId);
    if (fi < 0 || ti < 0) return;
    const [moved] = arr.splice(fi, 1);
    arr.splice(ti, 0, moved!);
    setCats(arr);
    void persist(arr);
  };

  return (
    <CelvaSkin>
      <Title title={t('resources.categories.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="between" style={{ marginBottom: 16, alignItems: 'flex-start', gap: 12 }}>
          <div style={{ maxWidth: '52ch' }}>
            <div className="section-label" style={{ margin: '0 0 6px' }}>
              {t('resources.categories.name', { smart_count: 2 })}
            </div>
            <div className="note">{t('resources.categories.reorder_hint')}</div>
          </div>
          <button className="btn btn-primary" onClick={() => redirect('create', 'categories')}>
            <AddIcon sx={{ fontSize: 16 }} /> {t('resources.categories.add')}
          </button>
        </div>

        {cats.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<CategoryIcon sx={{ fontSize: 40 }} />}
              title={isLoading ? t('ra.page.loading') : t('resources.categories.empty')}
            />
          </div>
        ) : (
          <div className="list-wrap">
            {cats.map((c) => (
              <div
                key={c.id}
                className={`lrow cat${overId === c.id ? ' drop-target' : ''}`}
                draggable
                onClick={() => redirect('edit', 'categories', c.id)}
                onDragStart={(e) => {
                  dragId.current = c.id;
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (overId !== c.id) setOverId(c.id);
                }}
                onDragLeave={() => setOverId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  onDrop(c.id);
                }}
                onDragEnd={() => {
                  setOverId(null);
                  dragId.current = null;
                }}
              >
                <div
                  className="drag-handle"
                  style={{ cursor: 'grab' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <DragIndicatorIcon sx={{ fontSize: 18 }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="lname">
                    {c.name?.fr}
                    {c.name?.en && <span className="cat-en">{c.name.en}</span>}
                  </div>
                  <div className="lsub">
                    <span className="lref">celva.store/{c.slug}</span>
                  </div>
                </div>
                <div className="lcell">
                  <div className="lc-count">{c.productCount ?? 0}</div>
                  <div className="lc-l">
                    {(c.productCount ?? 0) > 1
                      ? t('resources.products.name', { smart_count: 2 })
                      : t('resources.products.name', { smart_count: 1 })}
                  </div>
                </div>
                <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                  <button
                    className="icon-btn"
                    title={t('ra.action.edit')}
                    onClick={(e) => {
                      e.stopPropagation();
                      redirect('edit', 'categories', c.id);
                    }}
                  >
                    <EditIcon sx={{ fontSize: 16 }} />
                  </button>
                  <button
                    className="icon-btn"
                    title={
                      (c.productCount ?? 0) > 0
                        ? t('resources.categories.delete_blocked')
                        : t('ra.action.delete')
                    }
                    style={
                      (c.productCount ?? 0) > 0 ? { opacity: 0.4 } : { color: 'var(--st-urgent)' }
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if ((c.productCount ?? 0) > 0) {
                        notify('resources.categories.delete_blocked', { type: 'warning' });
                      } else {
                        redirect('edit', 'categories', c.id);
                      }
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="note" style={{ marginTop: 12, fontStyle: 'italic' }}>
          {t('resources.categories.delete_note')}
        </div>
      </div>
    </CelvaSkin>
  );
};
