import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoreAdminContext, Resource, testDataProvider } from 'react-admin';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumb } from '../src/components/Breadcrumb';
import { i18nProvider } from '../src/i18nProvider';
import { makeAuthProvider } from './renderWithAdmin';

/**
 * Breadcrumb relies on useGetResourceLabel, so the resource must be registered.
 * CoreAdminContext + a <Resource> registration provides that resource store.
 */
const renderBreadcrumb = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CoreAdminContext
        dataProvider={testDataProvider()}
        authProvider={makeAuthProvider()}
        i18nProvider={i18nProvider}
      >
        <Resource name="categories" />
        <Breadcrumb />
      </CoreAdminContext>
    </MemoryRouter>,
  );

describe('<Breadcrumb>', () => {
  it('renders nothing on the dashboard/home route', () => {
    const { container } = renderBreadcrumb('/');
    expect(container.querySelector('[aria-label="breadcrumb"]')).toBeNull();
  });

  it('renders Home → resource on a list route', async () => {
    renderBreadcrumb('/categories');
    expect(await screen.findByLabelText('breadcrumb')).toBeInTheDocument();
    // Home crumb uses the dashboard label.
    expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    // Resource crumb uses the plural resource label.
    expect(screen.getByText('Catégories')).toBeInTheDocument();
  });

  it('appends the action crumb (create) on a create route', async () => {
    renderBreadcrumb('/categories/create');
    expect(await screen.findByLabelText('breadcrumb')).toBeInTheDocument();
    // ra.action.create → "Créer".
    expect(screen.getByText('Créer')).toBeInTheDocument();
  });
});
