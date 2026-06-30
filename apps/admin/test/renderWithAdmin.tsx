import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import {
  AdminContext,
  type AuthProvider,
  type DataProvider,
  testDataProvider,
} from 'react-admin';
import { MemoryRouter } from 'react-router-dom';
import { i18nProvider } from '../src/i18nProvider';

/**
 * Test harness for React-Admin components. Wraps the subject in an
 * <AdminContext> with the real i18nProvider (so FR/EN labels resolve exactly
 * like production) plus a mockable data/auth provider. No network is touched —
 * every provider method defaults to a vi.fn() the test can assert against.
 */

export const makeDataProvider = (overrides: Partial<DataProvider> = {}): DataProvider =>
  testDataProvider({
    getList: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getOne: vi.fn().mockResolvedValue({ data: { id: 1 } }),
    getMany: vi.fn().mockResolvedValue({ data: [] }),
    getManyReference: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    create: vi.fn((resource, params) =>
      Promise.resolve({ data: { id: 'new-id', ...params.data } }),
    ),
    update: vi.fn((resource, params) => Promise.resolve({ data: { ...params.data, id: params.id } })),
    updateMany: vi.fn().mockResolvedValue({ data: [] }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    deleteMany: vi.fn().mockResolvedValue({ data: [] }),
    ...overrides,
  } as Partial<DataProvider>);

export const makeAuthProvider = (overrides: Partial<AuthProvider> = {}): AuthProvider => ({
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  checkAuth: vi.fn().mockResolvedValue(undefined),
  checkError: vi.fn().mockResolvedValue(undefined),
  getPermissions: vi.fn().mockResolvedValue('ADMIN'),
  getIdentity: vi.fn().mockResolvedValue({ id: 'u1', fullName: 'Admin' }),
  ...overrides,
});

export type RenderWithAdminOptions = {
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
  initialEntries?: string[];
};

export const renderWithAdmin = (
  ui: ReactNode,
  { dataProvider, authProvider, initialEntries = ['/'] }: RenderWithAdminOptions = {},
) => {
  const dp = dataProvider ?? makeDataProvider();
  const ap = authProvider ?? makeAuthProvider();
  const utils = render(
    <MemoryRouter initialEntries={initialEntries}>
      <AdminContext dataProvider={dp} authProvider={ap} i18nProvider={i18nProvider}>
        {ui}
      </AdminContext>
    </MemoryRouter>,
  );
  return { ...utils, dataProvider: dp, authProvider: ap };
};
