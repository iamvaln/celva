import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { ResourceContextProvider } from 'react-admin';
import { CategoryEdit } from '../src/resources/categories/CategoryEdit';
import { makeDataProvider, renderWithAdmin } from './renderWithAdmin';

const byName = (name: string) =>
  document.querySelector(`[name="${name}"]`) as HTMLInputElement;

const existing = {
  id: 'cat-1',
  name: { fr: 'Robes', en: 'Dresses' },
  slug: 'robes',
  sortOrder: 3,
};

const renderCategoryEdit = (dataProvider = makeDataProvider({
  getOne: vi.fn().mockResolvedValue({ data: existing }),
})) =>
  renderWithAdmin(
    <ResourceContextProvider value="categories">
      <Routes>
        <Route path="/categories/:id" element={<CategoryEdit />} />
        {/* Catch the post-save redirect to the list so it doesn't warn. */}
        <Route path="/categories" element={<div>list</div>} />
      </Routes>
    </ResourceContextProvider>,
    { dataProvider, initialEntries: ['/categories/cat-1'] },
  );

describe('Category edit journey', () => {
  it('hydrates the form from getOne with the existing record', async () => {
    renderCategoryEdit();
    await waitFor(() => expect(byName('name.fr')?.value).toBe('Robes'));
    expect(byName('name.en').value).toBe('Dresses');
    expect(byName('slug').value).toBe('robes');
  });

  it('does NOT auto-rewrite an existing slug when the name is renamed', async () => {
    const user = userEvent.setup();
    renderCategoryEdit();

    await waitFor(() => expect(byName('name.fr')?.value).toBe('Robes'));
    await user.clear(byName('name.fr'));
    await user.type(byName('name.fr'), 'Robes longues');

    // Existing slug counts as "already touched" → public URL stays stable.
    expect(byName('slug').value).toBe('robes');
  });

  it('submits update with the patched name via dataProvider.update', async () => {
    const user = userEvent.setup();
    const update = vi.fn((_r, params) => Promise.resolve({ data: { ...existing, ...params.data } }));
    const dp = makeDataProvider({
      getOne: vi.fn().mockResolvedValue({ data: existing }),
      update,
    });
    renderCategoryEdit(dp);

    await waitFor(() => expect(byName('name.fr')?.value).toBe('Robes'));
    await user.clear(byName('name.en'));
    await user.type(byName('name.en'), 'Gowns');
    await user.click(screen.getByRole('button', { name: /Enregistrer|Save/i }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const params = update.mock.calls[0]![1];
    expect(params.id).toBe('cat-1');
    expect(params.data.name.en).toBe('Gowns');
    expect(params.data.slug).toBe('robes');
  });
});
