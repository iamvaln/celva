import './articles.css';

import { useMemo, useState } from 'react';
import { Title, useGetList, useRedirect } from 'react-admin';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ArticleIcon from '@mui/icons-material/Article';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Article } from '../../types';
import { CelvaSkin } from '../../components/CelvaSkin';
import { EmptyState } from '../../components/EmptyState';
import { relativeFr } from '../orders/orderSkin';

type ArticleCategory = Article['category'];

const CATEGORY_META: Record<ArticleCategory, { label: string; tone: string }> = {
  STYLE: { label: 'Style', tone: '#9a6a4f' },
  BEHIND_THE_SCENES: { label: 'Coulisses', tone: '#6b7f54' },
  EVENTS: { label: 'Événements', tone: '#9a5a6a' },
  GUIDES: { label: 'Guides', tone: '#5a7f9a' },
};

const CATEGORY_KEYS = Object.keys(CATEGORY_META) as ArticleCategory[];

const PUB_META = {
  pub: { label: 'Publié', sc: 's-done' },
  draft: { label: 'Brouillon', sc: 's-neutral' },
} as const;

const TABS: Array<{ id: string; label: string; match: (a: Article) => boolean }> = [
  { id: 'all', label: 'Tous', match: () => true },
  { id: 'pub', label: 'Publiés', match: (a) => a.isPublished },
  { id: 'draft', label: 'Brouillons', match: (a) => !a.isPublished },
];

const CategoryPill = ({ category }: { category: ArticleCategory }) => {
  const meta = CATEGORY_META[category];
  return (
    <span className="cat-pill" style={{ ['--cc' as string]: meta?.tone }}>
      {meta?.label ?? category}
    </span>
  );
};

const StatusPill = ({ published }: { published: boolean }) => {
  const s = published ? PUB_META.pub : PUB_META.draft;
  return (
    <span className={`pill ${s.sc}`}>
      <span className="pdot" />
      {s.label}
    </span>
  );
};

export const ArticleList = () => {
  const redirect = useRedirect();
  const [tab, setTab] = useState('all');
  const [cat, setCat] = useState<'all' | ArticleCategory>('all');
  const [q, setQ] = useState('');

  const { data, isLoading } = useGetList<Article>('articles', {
    pagination: { page: 1, perPage: 100 },
    sort: { field: 'createdAt', order: 'DESC' },
  });

  const articles = useMemo(() => data ?? [], [data]);

  const open = (id: string) => redirect('edit', 'articles', id);

  const filtered = useMemo(() => {
    const tabDef = TABS.find((tt) => tt.id === tab) ?? TABS[0]!;
    let r = articles.filter((a) => tabDef.match(a));
    if (cat !== 'all') r = r.filter((a) => a.category === cat);
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter(
        (a) =>
          (a.title?.fr ?? '').toLowerCase().includes(qq) ||
          (a.slug ?? '').toLowerCase().includes(qq),
      );
    }
    return r;
  }, [articles, tab, cat, q]);

  const publishedN = articles.filter((a) => a.isPublished).length;
  const draftN = articles.length - publishedN;

  return (
    <CelvaSkin>
      <Title title="Journal" />
      <div className="fade-in" style={{ padding: '8px 4px 64px' }}>
        {/* summary strip */}
        <div className="dom-summary">
          <div className="ds-item">
            <div className="ds-v num">{articles.length}</div>
            <div className="ds-l">articles</div>
          </div>
          <div className="ds-item">
            <div className="ds-v num" style={{ color: 'var(--st-done)' }}>
              {publishedN}
            </div>
            <div className="ds-l">publiés</div>
          </div>
          <div className="ds-item">
            <div className="ds-v num">{draftN}</div>
            <div className="ds-l">brouillons</div>
          </div>
          <div className="ds-item">
            <div className="ds-v num">{CATEGORY_KEYS.length}</div>
            <div className="ds-l">catégories</div>
          </div>
        </div>

        {/* toolbar */}
        <div className="toolbar">
          <div className="search">
            <SearchIcon />
            <input
              placeholder="Rechercher un article…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => redirect('create', 'articles')}>
            <AddIcon sx={{ fontSize: 16 }} />
            Article
          </button>
        </div>

        {/* status tabs */}
        <div className="tabs">
          {TABS.map((tt) => {
            const n = articles.filter((a) => tt.match(a)).length;
            return (
              <button
                key={tt.id}
                className={`tab${tt.id === tab ? ' active' : ''}`}
                onClick={() => setTab(tt.id)}
              >
                {tt.label}
                <span className="tcount num">{n}</span>
              </button>
            );
          })}
        </div>

        {/* category chips */}
        <div className="subfilters">
          <button className={`chip${cat === 'all' ? ' on' : ''}`} onClick={() => setCat('all')}>
            Toutes catégories
          </button>
          {CATEGORY_KEYS.map((k) => (
            <button
              key={k}
              className={`chip${cat === k ? ' on' : ''}`}
              onClick={() => setCat(k)}
            >
              {CATEGORY_META[k].label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<ArticleIcon sx={{ fontSize: 44 }} />}
              title={isLoading ? 'Chargement…' : 'Aucun article dans cette vue'}
              sub={isLoading ? undefined : 'Aucun résultat ne correspond à ces filtres.'}
              actionLabel={isLoading ? undefined : 'Réinitialiser les filtres'}
              onAction={() => {
                setTab('all');
                setCat('all');
                setQ('');
              }}
            />
          </div>
        ) : (
          <div className="list-wrap">
            {filtered.map((a) => (
              <button key={a.id} className="lrow art" onClick={() => open(a.id)}>
                <div
                  className={`cover-thumb art-vig${a.coverImage ? '' : ' nocover'}`}
                  style={
                    a.coverImage ? { backgroundImage: `url(${a.coverImage})` } : undefined
                  }
                >
                  {!a.coverImage && <ArticleIcon sx={{ fontSize: 16 }} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="lname">{a.title?.fr || 'Sans titre'}</div>
                  <div className="lsub">
                    <span>
                      {a.isPublished && a.publishedAt
                        ? `Publié ${relativeFr(a.publishedAt)}`
                        : `Modifié ${relativeFr(a.updatedAt)}`}
                    </span>
                    {a.author?.name && (
                      <>
                        <span>·</span>
                        <span>par {a.author.name}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="art-catcell">
                  <CategoryPill category={a.category} />
                </div>
                <div className="art-statuscell">
                  <StatusPill published={a.isPublished} />
                </div>
                <div className="lchev">
                  <ChevronRightIcon sx={{ fontSize: 18 }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </CelvaSkin>
  );
};
