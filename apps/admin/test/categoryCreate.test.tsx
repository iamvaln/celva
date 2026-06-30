import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceContextProvider } from 'react-admin';
import { CategoryCreate } from '../src/resources/categories/CategoryCreate';
import { makeDataProvider, renderWithAdmin } from './renderWithAdmin';

const renderCategoryCreate = (dataProvider = makeDataProvider()) =>
  renderWithAdmin(
    <ResourceContextProvider value="categories">
      <CategoryCreate />
    </ResourceContextProvider>,
    { dataProvider, initialEntries: ['/categories/create'] },
  );

const byName = (name: string) =>
  document.querySelector(`[name="${name}"]`) as HTMLInputElement;

describe('Category create journey', () => {
  it('renders the bilingual name inputs, slug field and the sort-order helper', async () => {
    renderCategoryCreate();

    expect(await screen.findByText('Nom (FR)')).toBeInTheDocument();
    expect(screen.getByText('Name (EN)')).toBeInTheDocument();
    expect(byName('name.fr')).toBeInTheDocument();
    expect(byName('slug')).toBeInTheDocument();

    // SortOrderInput renders its translated helper text from shared.helpers.sort_order
    // (i.e. the key is resolved, not shown raw).
    expect(screen.getByText(/Position d'affichage/)).toBeInTheDocument();
    expect(screen.queryByText('shared.helpers.sort_order')).not.toBeInTheDocument();
  });

  it('auto-derives the slug from name.fr', async () => {
    const user = userEvent.setup();
    renderCategoryCreate();

    const nameFr = (await screen.findByText('Nom (FR)')) && byName('name.fr');
    await user.type(nameFr, 'Robes de Soirée');
    await waitFor(() => expect(byName('slug').value).toBe('robes-de-soiree'));
  });

  it('blocks submit and shows a required error when a required name field is empty', async () => {
    const user = userEvent.setup();
    const dp = makeDataProvider();
    renderCategoryCreate(dp);

    await screen.findByText('Nom (FR)');
    // Dirty the form (enables Save) but leave the required name.en empty.
    await user.type(byName('name.fr'), 'Seulement FR');
    await user.click(screen.getByRole('button', { name: /Enregistrer|Save/i }));

    // Required validation fires on name.en; create is never called.
    await waitFor(() =>
      expect(screen.getAllByText(/requis|required/i).length).toBeGreaterThan(0),
    );
    expect(dp.create).not.toHaveBeenCalled();
  });

  it('calls dataProvider.create with the bilingual payload on valid submit', async () => {
    const user = userEvent.setup();
    const create = vi.fn((_resource, params) =>
      Promise.resolve({ data: { id: 'cat-1', ...params.data } }),
    );
    const dp = makeDataProvider({ create });
    renderCategoryCreate(dp);

    await screen.findByText('Nom (FR)');
    await user.type(byName('name.fr'), 'Accessoires');
    await user.type(byName('name.en'), 'Accessories');
    await waitFor(() => expect(byName('slug').value).toBe('accessoires'));

    await user.click(screen.getByRole('button', { name: /Enregistrer|Save/i }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const params = create.mock.calls[0]![1];
    expect(params.data.name).toEqual({ fr: 'Accessoires', en: 'Accessories' });
    expect(params.data.slug).toBe('accessoires');
  });
});
