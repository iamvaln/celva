import { useEffect, useMemo, useRef, useState } from 'react';
import { Title, useGetList, useNotify, useRedirect, useRefresh, useTranslate } from 'react-admin';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CollectionsIcon from '@mui/icons-material/Collections';
import type { Collection } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { fetchJson } from '../../http';
import { API_BASE } from '../../config';

type Filter = 'all' | 'active' | 'inactive';

const isLive = (c: Collection) => c.isActive && (c.productCount ?? 0) > 0;

export const CollectionList = () => {
  const t = useTranslate();
  const redirect = useRedirect();
  const notify = useNotify();
  const refresh = useRefresh();
  const { data, isLoading } = useGetList<Collection>('collections', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'sortOrder', order: 'ASC' },
  });

  const [cols, setCols] = useState<Collection[]>([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const dragId = useRef<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  useEffect(() => {
    if (data) setCols(data);
  }, [data]);

  const canDrag = filter === 'all' && !q.trim();

  const rows = useMemo(() => {
    let r = cols;
    if (filter === 'active') r = r.filter((c) => c.isActive);
    if (filter === 'inactive') r = r.filter((c) => !c.isActive);
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter((c) => (c.name?.fr ?? '').toLowerCase().includes(qq));
    }
    return r;
  }, [cols, filter, q]);

  const activeN = cols.filter((c) => c.isActive).length;
  const liveN = cols.filter(isLive).length;

  const persist = async (ordered: Collection[]) => {
    try {
      await fetchJson(`${API_BASE}/collections/reorder`, {
        method: 'POST',
        body: JSON.stringify({ ids: ordered.map((c) => c.id) }),
      });
      notify('resources.collections.notifications.reordered', { type: 'info' });
    } catch (err) {
      notify(err instanceof Error ? err.message : t('ra.notification.http_error'), { type: 'error' });
      refresh();
    }
  };

  const onDrop = (toId: string) => {
    const from = dragId.current;
    setOverId(null);
    dragId.current = null;
    if (!canDrag || !from || from === toId) return;
    const arr = cols.slice();
    const fi = arr.findIndex((c) => c.id === from);
    const ti = arr.findIndex((c) => c.id === toId);
    if (fi < 0 || ti < 0) return;
    const [moved] = arr.splice(fi, 1);
    arr.splice(ti, 0, moved!);
    setCols(arr);
    void persist(arr);
  };

  return (
    <CelvaSkin>
      <Title title={t('resources.collections.name', { smart_count: 2 })} />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        <div className="toolbar">
          <div className="search">
            <SearchIcon />
            <input
              placeholder={t('resources.collections.search')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => redirect('create', 'collections')}>
            <AddIcon sx={{ fontSize: 16 }} /> {t('resources.collections.add')}
          </button>
        </div>

        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v">{cols.length}</div>
            <div className="ds-l">{t('resources.collections.name', { smart_count: 2 })}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v">{activeN}</div>
            <div className="ds-l">{t('resources.collections.summary.active')}</div>
          </div>
          <div className="ds-item">
            <div className="ds-v" style={{ color: 'var(--st-done)' }}>
              {liveN}
            </div>
            <div className="ds-l">{t('resources.collections.summary.live')}</div>
          </div>
          <div className={`ds-item${activeN - liveN > 0 ? ' warn' : ''}`}>
            <div className="ds-v">{activeN - liveN}</div>
            <div className="ds-l">{t('resources.collections.summary.hidden')}</div>
          </div>
        </div>

        <div className="subfilters">
          {(['all', 'active', 'inactive'] as Filter[]).map((id) => (
            <button
              key={id}
              className={`chip${filter === id ? ' on' : ''}`}
              onClick={() => setFilter(id)}
            >
              {t(`resources.collections.filters.${id}`)}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span className="note">
            {canDrag
              ? t('resources.collections.reorder_hint')
              : t('resources.collections.reorder_locked')}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<CollectionsIcon sx={{ fontSize: 40 }} />}
              title={isLoading ? t('ra.page.loading') : t('resources.collections.empty')}
            />
          </div>
        ) : (
          <div className="list-wrap">
            {rows.map((c) => {
              const live = isLive(c);
              return (
                <div
                  key={c.id}
                  className={`lrow coll${overId === c.id ? ' drop-target' : ''}`}
                  draggable={canDrag}
                  onClick={() => redirect('edit', 'collections', c.id)}
                  onDragStart={(e) => {
                    if (!canDrag) return;
                    dragId.current = c.id;
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (!canDrag) return;
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
                    style={{ cursor: canDrag ? 'grab' : 'default' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canDrag && <DragIndicatorIcon sx={{ fontSize: 18 }} />}
                  </div>
                  <div className="cover-thumb vignette">
                    <CollectionsIcon sx={{ fontSize: 16 }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="lname">{c.name?.fr}</div>
                    <div className="lsub">
                      <span className="lref">celva.store/c/{c.slug}</span>
                      <span>·</span>
                      <span className={`vis-flag ${live ? 'live' : 'hidden'}`}>
                        <span className="vdot" />
                        {live
                          ? t('resources.collections.visible')
                          : c.isActive
                            ? t('resources.collections.masked')
                            : t('resources.collections.inactive')}
                      </span>
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
                  <div style={{ textAlign: 'right' }}>
                    <span className={`pill ${c.isActive ? 's-done' : 's-neutral'}`}>
                      <span className="pdot" />
                      {c.isActive
                        ? t('resources.collections.active')
                        : t('resources.collections.inactive')}
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
