import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceContextProvider } from 'react-admin';
import { CollectionCreate } from '../src/resources/collections/CollectionCreate';
import { makeDataProvider, renderWithAdmin } from './renderWithAdmin';

const byName = (name: string) =>
  document.querySelector(`[name="${name}"]`) as HTMLInputElement;

const renderCollectionCreate = (dataProvider = makeDataProvider()) =>
  renderWithAdmin(
    <ResourceContextProvider value="collections">
      <CollectionCreate />
    </ResourceContextProvider>,
    { dataProvider, initialEntries: ['/collections/create'] },
  );

describe('Collection create journey', () => {
  it('renders name/slug/isActive inputs and derives slug from the FR name', async () => {
    const user = userEvent.setup();
    renderCollectionCreate();

    await screen.findByText('Nom (FR)');
    expect(byName('name.fr')).toBeInTheDocument();
    expect(byName('slug')).toBeInTheDocument();
    expect(byName('isActive')).toBeInTheDocument();

    await user.type(byName('name.fr'), 'Collection Noël 2026');
    await waitFor(() => expect(byName('slug').value).toBe('collection-noel-2026'));
  });

  it('submits create with name, slug and the default isActive=true', async () => {
    const user = userEvent.setup();
    const create = vi.fn((_resource, params) =>
      Promise.resolve({ data: { id: 'col-1', ...params.data } }),
    );
    const dp = makeDataProvider({ create });
    renderCollectionCreate(dp);

    await screen.findByText('Nom (FR)');
    await user.type(byName('name.fr'), 'Été');
    await user.type(byName('name.en'), 'Summer');
    await waitFor(() => expect(byName('slug').value).toBe('ete'));

    await user.click(screen.getByRole('button', { name: /Enregistrer|Save/i }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const params = create.mock.calls[0]![1];
    expect(params.data.name).toEqual({ fr: 'Été', en: 'Summer' });
    expect(params.data.slug).toBe('ete');
    expect(params.data.isActive).toBe(true);
  });
});
