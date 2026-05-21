import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import {
  type ShopFilters,
  listCategories,
  listProducts,
  pickLocalized,
} from '@/lib/catalogue';
import { ProductGrid } from '@/components/ProductGrid';

type SearchParams = {
  q?: string;
  category?: string;
  sort?: string;
  page?: string;
};

const SORT_OPTIONS: Record<string, { sortBy: ShopFilters['sortBy']; sortDir: ShopFilters['sortDir'] }> = {
  newest: { sortBy: 'createdAt', sortDir: 'desc' },
  price_asc: { sortBy: 'displayPrice', sortDir: 'asc' },
  price_desc: { sortBy: 'displayPrice', sortDir: 'desc' },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'shop' });
  return { title: t('title'), description: t('subtitle') };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const t = await getTranslations('shop');

  const sortKey = sp.sort && sp.sort in SORT_OPTIONS ? sp.sort : 'newest';
  const sort = SORT_OPTIONS[sortKey]!;
  const filters: ShopFilters = {
    page: sp.page ? Math.max(1, Number(sp.page)) : 1,
    search: sp.q?.trim() || undefined,
    categoryId: sp.category || undefined,
    sortBy: sort.sortBy,
    sortDir: sort.sortDir,
  };

  const [productsPage, categoriesPage] = await Promise.all([
    listProducts(filters, locale),
    listCategories(locale),
  ]);

  const totalPages = Math.max(1, Math.ceil(productsPage.total / productsPage.pageSize));
  const currentPage = productsPage.page;

  const pageHref = (n: number) => {
    const qs = new URLSearchParams();
    if (sp.q) qs.set('q', sp.q);
    if (sp.category) qs.set('category', sp.category);
    if (sp.sort) qs.set('sort', sp.sort);
    if (n > 1) qs.set('page', String(n));
    const query = qs.toString();
    return query ? `?${query}` : '';
  };

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva">
        <header className="mb-8 max-w-3xl">
          <p className="eyebrow mb-2">{t('subtitle')}</p>
          <h1 className="font-display text-h1">{t('title')}</h1>
        </header>

        <form
          method="GET"
          className="mb-10 grid grid-cols-1 gap-4 border-y border-border py-6 sm:grid-cols-2 lg:grid-cols-4"
          aria-label={t('filter.search_label')}
        >
          <label className="block">
            <span className="eyebrow mb-1 block">{t('filter.search_label')}</span>
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder={t('filter.search_placeholder')}
              className="input-underline"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="eyebrow mb-1 block">{t('filter.category_label')}</span>
            <select
              name="category"
              defaultValue={sp.category ?? ''}
              className="input-underline appearance-none bg-transparent"
            >
              <option value="">{t('filter.category_all')}</option>
              {categoriesPage.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {pickLocalized(c.name, locale)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow mb-1 block">{t('filter.sort_label')}</span>
            <select
              name="sort"
              defaultValue={sortKey}
              className="input-underline appearance-none bg-transparent"
            >
              <option value="newest">{t('filter.sort.newest')}</option>
              <option value="price_asc">{t('filter.sort.price_asc')}</option>
              <option value="price_desc">{t('filter.sort.price_desc')}</option>
            </select>
          </label>
          <div className="flex items-end gap-3">
            <button type="submit" className="btn btn-primary">
              {t('filter.apply')}
            </button>
            <Link href="/shop" className="btn btn-ghost">
              {t('filter.reset')}
            </Link>
          </div>
        </form>

        <ProductGrid
          products={productsPage.data}
          locale={locale}
          emptyLabel={t('empty')}
          imagePlaceholderLabel={t('product_card.view')}
        />

        {totalPages > 1 && (
          <nav
            aria-label="pagination"
            className="mt-12 flex items-center justify-between border-t border-border pt-6"
          >
            {currentPage > 1 ? (
              <a className="btn btn-ghost" href={pageHref(currentPage - 1)}>
                {t('pagination.prev')}
              </a>
            ) : (
              <span className="btn btn-ghost opacity-40" aria-disabled>
                {t('pagination.prev')}
              </span>
            )}
            <span className="font-body text-small text-foreground-muted">
              {t('pagination.page_of_total', { page: currentPage, total: totalPages })}
            </span>
            {currentPage < totalPages ? (
              <a className="btn btn-ghost" href={pageHref(currentPage + 1)}>
                {t('pagination.next')}
              </a>
            ) : (
              <span className="btn btn-ghost opacity-40" aria-disabled>
                {t('pagination.next')}
              </span>
            )}
          </nav>
        )}
      </div>
    </section>
  );
}
