import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CelvaLogin } from '../src/components/CelvaLogin';
import { makeAuthProvider, renderWithAdmin } from './renderWithAdmin';

const usernameInput = () => document.querySelector('input[name="username"]') as HTMLInputElement;
const passwordInput = () => document.querySelector('input[name="password"]') as HTMLInputElement;
const submitButton = () => document.querySelector('button[type="submit"]') as HTMLButtonElement;

describe('Login journey', () => {
  it('renders the login form with the Celva subtitle and credential fields', async () => {
    renderWithAdmin(<CelvaLogin />, { initialEntries: ['/login'] });

    // Bespoke FR subtitle key resolves through the real i18nProvider.
    expect(await screen.findByText('Espace d’administration Celva')).toBeInTheDocument();
    expect(usernameInput()).toBeInTheDocument();
    expect(passwordInput()).toBeInTheDocument();
    expect(submitButton()).toBeInTheDocument();
  });

  it('submits typed credentials to authProvider.login', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue(undefined);
    const authProvider = makeAuthProvider({ login });

    renderWithAdmin(<CelvaLogin />, { authProvider, initialEntries: ['/login'] });

    await waitFor(() => expect(usernameInput()).toBeInTheDocument());
    await user.type(usernameInput(), 'admin@celva.store');
    await user.type(passwordInput(), 'secret123');
    await user.click(submitButton());

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'admin@celva.store', password: 'secret123' }),
      ),
    );
  });

  it('keeps the form mounted when login is rejected (no redirect on failure)', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(new Error('forbidden_role'));
    const authProvider = makeAuthProvider({ login });

    renderWithAdmin(<CelvaLogin />, { authProvider, initialEntries: ['/login'] });

    await waitFor(() => expect(usernameInput()).toBeInTheDocument());
    await user.type(usernameInput(), 'client@celva.store');
    await user.type(passwordInput(), 'nope');
    await user.click(submitButton());

    await waitFor(() => expect(login).toHaveBeenCalled());
    // Login rejected → no navigation away from the form; submit is still present.
    expect(submitButton()).toBeInTheDocument();
  });
});
