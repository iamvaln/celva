import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dataProvider } from './dataProvider';
import { STORAGE_KEYS } from './config';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  window.localStorage.setItem(STORAGE_KEYS.accessToken, 'test-token');
  window.localStorage.setItem(STORAGE_KEYS.locale, 'fr');
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

const okJson = (body: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
  } as Response);

describe('dataProvider', () => {
  it('getList(users) sends pagination + filters and unwraps { data }', async () => {
    mockFetch.mockReturnValue(
      okJson({
        data: { data: [{ id: 'u1', name: 'Amara' }], total: 42, page: 2, pageSize: 10 },
        requestId: 'r-1',
      }),
    );

    const result = await dataProvider.getList('users', {
      pagination: { page: 2, perPage: 10 },
      sort: { field: 'createdAt', order: 'DESC' },
      filter: { role: 'ADMIN', search: 'am' },
      meta: undefined,
    });

    expect(result).toEqual({ data: [{ id: 'u1', name: 'Amara' }], total: 42 });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/users\?/);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('10');
    expect(params.get('sortBy')).toBe('createdAt');
    expect(params.get('sortDir')).toBe('desc');
    expect(params.get('role')).toBe('ADMIN');
    expect(params.get('search')).toBe('am');
    const headers = init.headers as Headers;
    expect(headers.get('X-App-Source')).toBe('WEB_ADMIN');
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(headers.get('Accept-Language')).toBe('fr');
  });

  it('getList(categories) sends pagination + search and unwraps { data }', async () => {
    mockFetch.mockReturnValue(
      okJson({
        data: {
          data: [{ id: 'c1', slug: 'robes', name: { fr: 'Robes', en: 'Dresses' }, sortOrder: 0 }],
          total: 7,
          page: 1,
          pageSize: 50,
        },
        requestId: 'r-cat',
      }),
    );

    const result = await dataProvider.getList('categories', {
      pagination: { page: 1, perPage: 50 },
      sort: { field: 'sortOrder', order: 'ASC' },
      filter: { search: 'rob' },
      meta: undefined,
    });

    expect(result.total).toBe(7);
    expect(result.data[0].slug).toBe('robes');
    const [url] = mockFetch.mock.calls[0] as [string];
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('search')).toBe('rob');
    expect(params.get('sortBy')).toBe('sortOrder');
    expect(params.get('sortDir')).toBe('asc');
  });

  it('getList(products) passes search + categoryId filter via query params', async () => {
    mockFetch.mockReturnValue(
      okJson({
        data: {
          data: [
            { id: 'p1', slug: 'robe-soiree', displayPrice: '25000.00', isActive: true },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        },
        requestId: 'r-p',
      }),
    );

    await dataProvider.getList('products', {
      pagination: { page: 1, perPage: 20 },
      sort: { field: 'createdAt', order: 'DESC' },
      filter: { search: 'rob', categoryId: 'cat-1' },
      meta: undefined,
    });

    const [url] = mockFetch.mock.calls[0] as [string];
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('search')).toBe('rob');
    expect(params.get('categoryId')).toBe('cat-1');
    expect(params.get('sortBy')).toBe('createdAt');
  });

  it('getList(settings) handles non-paginated array response', async () => {
    mockFetch.mockReturnValue(
      okJson({
        data: [
          { id: 's1', key: 'TAX_RATE', value: '0.1925' },
          { id: 's2', key: 'CONTACT_EMAIL', value: 'contact@celva.store' },
        ],
        requestId: 'r-2',
      }),
    );

    const result = await dataProvider.getList('settings', {
      pagination: { page: 1, perPage: 100 },
      sort: { field: 'key', order: 'ASC' },
      filter: {},
      meta: undefined,
    });

    expect(result.total).toBe(2);
    expect(result.data[0].id).toBe('s1');
  });

  it('getOne(settings, key) hits /settings/:key', async () => {
    mockFetch.mockReturnValue(
      okJson({ data: { id: 'sid', key: 'TAX_RATE', value: '0.1925' } }),
    );
    const result = await dataProvider.getOne('settings', { id: 'TAX_RATE' });
    expect(result.data.id).toBe('sid');
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toMatch(/\/settings\/TAX_RATE$/);
  });

  it('update(users) sends PATCH with JSON body', async () => {
    mockFetch.mockReturnValue(okJson({ data: { id: 'u1', name: 'Updated' } }));
    await dataProvider.update('users', {
      id: 'u1',
      data: { name: 'Updated' },
      previousData: { id: 'u1', name: 'Old' },
    });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/users\/u1$/);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ name: 'Updated' });
  });

  it('throws with the API message on error', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 403,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Accès refusé.', statusCode: 403 }),
      } as Response),
    );
    await expect(dataProvider.getOne('users', { id: 'u1' })).rejects.toThrow('Accès refusé.');
  });
});
