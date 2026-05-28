import type {
  CreateParams,
  CreateResult,
  DataProvider,
  DeleteManyParams,
  DeleteParams,
  DeleteResult,
  GetListParams,
  GetListResult,
  GetManyParams,
  GetManyReferenceParams,
  GetManyReferenceResult,
  GetManyResult,
  GetOneParams,
  GetOneResult,
  RaRecord,
  UpdateManyParams,
  UpdateParams,
  UpdateResult,
} from 'react-admin';
import { fetchJson } from './http';
import { API_BASE } from './config';
import type { PaginatedResponse } from './types';

/**
 * Resources that paginate via `{ page, pageSize, search, ... }` query params
 * and return `{ data, total, page, pageSize }`. Add to this list as new
 * paginated resources land.
 */
const PAGINATED_RESOURCES = new Set<string>([
  'users',
  'categories',
  'products',
  'attributes',
  'attribute-values',
  'variants',
  'collections',
  'promo-codes',
  'orders',
  'articles',
  'deliveries',
  'transactions',
  'sales-commissions',
  'stock-movements',
  'consignments',
  'suppliers',
  'raw-materials',
  'purchase-orders',
  'production-orders',
]);

/**
 * Resources whose primary key is a string other than `id` (e.g. Setting uses `key`).
 * React-Admin always sends `id`; we map it to/from the real param at the boundary.
 */
const ALT_PRIMARY_KEY: Record<string, string> = {
  settings: 'key',
};

/**
 * Resources whose admin-side view lives at `/{resource}/admin*` instead of
 * `/{resource}*` — used to expose internal fields (e.g. DeliveryZone.actualCost)
 * or include inactive rows that the public endpoint hides.
 */
const ADMIN_PATH_RESOURCES = new Set<string>([
  'delivery-zones',
  'pickup-points',
  'articles',
]);

const resourceListPath = (resource: string): string =>
  ADMIN_PATH_RESOURCES.has(resource)
    ? `${API_BASE}/${resource}/admin`
    : `${API_BASE}/${resource}`;

const resolvePath = (resource: string, id: string | number): string => {
  const base = ADMIN_PATH_RESOURCES.has(resource)
    ? `${API_BASE}/${resource}/admin`
    : `${API_BASE}/${resource}`;
  return `${base}/${encodeURIComponent(String(id))}`;
};

const tagRecord = <R extends RaRecord>(resource: string, record: Record<string, unknown>): R => {
  const altKey = ALT_PRIMARY_KEY[resource];
  if (altKey && record[altKey] !== undefined && record.id === undefined) {
    return { ...record, id: record[altKey] as string | number } as unknown as R;
  }
  return record as unknown as R;
};

export const dataProvider: DataProvider = {
  async getList<RecordType extends RaRecord = RaRecord>(
    resource: string,
    { pagination, sort, filter }: GetListParams,
  ): Promise<GetListResult<RecordType>> {
    if (PAGINATED_RESOURCES.has(resource)) {
      const params = new URLSearchParams();
      if (pagination) {
        params.set('page', String(pagination.page));
        params.set('pageSize', String(pagination.perPage));
      }
      if (sort) {
        params.set('sortBy', sort.field);
        params.set('sortDir', sort.order.toLowerCase());
      }
      Object.entries(filter ?? {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        params.set(key, String(value));
      });
      const url = `${API_BASE}/${resource}?${params.toString()}`;
      const { body } = await fetchJson<PaginatedResponse<Record<string, unknown>>>(url);
      return {
        data: body.data.map((r) => tagRecord<RecordType>(resource, r)),
        total: body.total,
      };
    }

    const { body } = await fetchJson<Record<string, unknown>[]>(resourceListPath(resource));
    return {
      data: body.map((r) => tagRecord<RecordType>(resource, r)),
      total: body.length,
    };
  },

  async getOne<RecordType extends RaRecord = RaRecord>(
    resource: string,
    { id }: GetOneParams<RecordType>,
  ): Promise<GetOneResult<RecordType>> {
    const { body } = await fetchJson<Record<string, unknown>>(resolvePath(resource, id));
    return { data: tagRecord<RecordType>(resource, body) };
  },

  async getMany<RecordType extends RaRecord = RaRecord>(
    resource: string,
    { ids }: GetManyParams<RecordType>,
  ): Promise<GetManyResult<RecordType>> {
    const results = await Promise.all(
      ids.map((id) => fetchJson<Record<string, unknown>>(resolvePath(resource, id))),
    );
    return { data: results.map((r) => tagRecord<RecordType>(resource, r.body)) };
  },

  async getManyReference<RecordType extends RaRecord = RaRecord>(
    resource: string,
    params: GetManyReferenceParams,
  ): Promise<GetManyReferenceResult<RecordType>> {
    return this.getList<RecordType>(resource, {
      pagination: params.pagination,
      sort: params.sort,
      filter: { ...(params.filter ?? {}), [params.target]: params.id },
    } as GetListParams);
  },

  async create<RecordType extends Omit<RaRecord, 'id'> = Omit<RaRecord, 'id'>, ResultRecordType extends RaRecord = RecordType & { id: string | number }>(
    resource: string,
    { data }: CreateParams,
  ): Promise<CreateResult<ResultRecordType>> {
    const { body } = await fetchJson<Record<string, unknown>>(`${API_BASE}/${resource}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { data: tagRecord<ResultRecordType>(resource, body) };
  },

  async update<RecordType extends RaRecord = RaRecord>(
    resource: string,
    { id, data }: UpdateParams,
  ): Promise<UpdateResult<RecordType>> {
    const { body } = await fetchJson<Record<string, unknown>>(resolvePath(resource, id), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return { data: tagRecord<RecordType>(resource, body) };
  },

  async updateMany<RecordType extends RaRecord = RaRecord>(
    resource: string,
    { ids, data }: UpdateManyParams,
  ) {
    await Promise.all(
      ids.map((id) =>
        fetchJson(resolvePath(resource, id), {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      ),
    );
    return { data: ids as RecordType['id'][] };
  },

  async delete<RecordType extends RaRecord = RaRecord>(
    resource: string,
    { id }: DeleteParams<RecordType>,
  ): Promise<DeleteResult<RecordType>> {
    const { body } = await fetchJson<Record<string, unknown> | null>(resolvePath(resource, id), {
      method: 'DELETE',
    });
    return { data: tagRecord<RecordType>(resource, body ?? { id }) };
  },

  async deleteMany<RecordType extends RaRecord = RaRecord>(
    resource: string,
    { ids }: DeleteManyParams<RecordType>,
  ) {
    await Promise.all(
      ids.map((id) =>
        fetchJson(resolvePath(resource, id), { method: 'DELETE' }),
      ),
    );
    return { data: ids as RecordType['id'][] };
  },
};
