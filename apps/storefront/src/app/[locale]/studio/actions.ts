'use server';

import type { Locale } from '@/i18n/routing';
import { apiFetch } from '@/lib/api';
import type { StudioRequestPayload } from '@/lib/studio';

/**
 * Submit a bespoke "studio" request. This is a server action so the
 * client form never imports lib/api (which reads the server-only
 * API_INTERNAL_URL at module load).
 */
export const submitStudioRequest = async (
  payload: StudioRequestPayload,
  locale: Locale,
): Promise<{ id: string }> => {
  return apiFetch<{ id: string }>('/studio/requests', {
    method: 'POST',
    body: payload,
    locale,
  });
};
