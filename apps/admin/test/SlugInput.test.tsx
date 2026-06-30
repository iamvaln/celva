import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimpleForm, TextInput } from 'react-admin';
import { SlugInput, slugify } from '../src/components/SlugInput';
import { renderWithAdmin } from './renderWithAdmin';

const slugInput = () => document.querySelector('input[name="slug"]') as HTMLInputElement;

describe('slugify()', () => {
  it('lowercases, strips accents and collapses non-alphanumerics to single hyphens', () => {
    expect(slugify('Robe de Soirée')).toBe('robe-de-soiree');
    expect(slugify('  Été 2026 !! ')).toBe('ete-2026');
    expect(slugify('A---B___C')).toBe('a-b-c');
    expect(slugify('')).toBe('');
  });
});

describe('<SlugInput>', () => {
  const Form = () => (
    <SimpleForm toolbar={false}>
      <TextInput source="name.fr" label="Nom" />
      <SlugInput source="slug" from="name.fr" />
    </SimpleForm>
  );

  it('auto-derives the slug from the name field until the user edits it', async () => {
    const user = userEvent.setup();
    renderWithAdmin(<Form />);

    const name = await screen.findByLabelText('Nom');
    await user.type(name, 'Robe de Soirée');

    await waitFor(() => expect(slugInput().value).toBe('robe-de-soiree'));
  });

  it('slugifies pasted slug input and then stops following the name', async () => {
    const user = userEvent.setup();
    renderWithAdmin(<Form />);

    const name = await screen.findByLabelText('Nom');
    await user.type(name, 'First Name');
    await waitFor(() => expect(slugInput().value).toBe('first-name'));

    // User overrides the slug (paste so the whole string slugifies at once).
    const slug = slugInput();
    await user.clear(slug);
    await user.click(slug);
    await user.paste('Custom Slug!');
    await waitFor(() => expect(slugInput().value).toBe('custom-slug'));

    // Further name edits must NOT overwrite the user-chosen slug.
    await user.type(name, ' Extra');
    await user.type(name, ' More');
    expect(slugInput().value).toBe('custom-slug');
  });
});
