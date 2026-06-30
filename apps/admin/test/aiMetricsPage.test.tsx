import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { AiMetricsPage } from '../src/resources/ai/AiMetricsPage';
import { renderWithAdmin } from './renderWithAdmin';

const mockFetch = vi.fn();

const okJson = (body: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve({ data: body }),
  } as Response);

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const metrics = {
  totals: { calls: 1234, inputTokens: 56789, outputTokens: 4321, successRate: 0.97 },
  byFeature: [{ feature: 'translate', calls: 800, inputTokens: 40000, outputTokens: 3000 }],
  byModel: [{ model: 'claude-haiku', calls: 1234, inputTokens: 56789, outputTokens: 4321 }],
  recent: [
    {
      id: 'log-1',
      feature: 'translate',
      provider: 'anthropic',
      model: 'claude-haiku',
      inputTokens: 50,
      outputTokens: 12,
      success: true,
      errorType: null,
      createdAt: '2026-06-01T10:00:00.000Z',
    },
  ],
};

describe('AI metrics page', () => {
  it('fetches and renders totals, per-feature/model tables and recent calls', async () => {
    mockFetch.mockReturnValue(okJson(metrics));
    renderWithAdmin(<AiMetricsPage />);

    // Title + bespoke headings resolve through i18n.
    expect(await screen.findByText('Métriques IA')).toBeInTheDocument();
    expect(screen.getByText('Par fonctionnalité')).toBeInTheDocument();
    expect(screen.getByText('Par modèle')).toBeInTheDocument();

    // Totals render: fr-FR groups thousands with a narrow no-break space
    // (Testing Library normalises it to a regular space).
    await waitFor(() =>
      expect(
        screen.getAllByText((_content, el) => /^1\D?234$/.test(el?.textContent ?? '')).length,
      ).toBeGreaterThan(0),
    );
    expect(screen.getByText('97%')).toBeInTheDocument();

    // Recent table shows the feature + model.
    expect(screen.getAllByText('claude-haiku').length).toBeGreaterThan(0);

    // Hit the metrics endpoint.
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toMatch(/\/ai\/usage\/metrics$/);
  });

  it('shows an error alert when the metrics request fails', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'boom' }),
      } as Response),
    );
    renderWithAdmin(<AiMetricsPage />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
