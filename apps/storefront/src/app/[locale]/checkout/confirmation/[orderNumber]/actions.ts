'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { routing } from '@/i18n/routing';

/**
 * Dev-stub completion for OM/MoMo orders. Calls the customer-facing
 * /me/orders/:id/retry-payment endpoint which auto-completes in this
 * batch (real provider integration lands when API credentials exist).
 *
 * On success → revalidate the confirmation page so the new status
 * (CONFIRMED + Payment COMPLETED) replaces the PENDING banner.
 * On failure → redirect to the same page; the page reads the order
 * fresh and the user sees whatever the API left behind.
 */
export async function completePaymentAction(formData: FormData): Promise<void> {
  const locale = (formData.get('locale') as 'fr' | 'en' | null) ?? 'fr';
  const orderId = String(formData.get('orderId') ?? '');
  const orderNumber = String(formData.get('orderNumber') ?? '');

  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect(`/${locale}/login`);
  }

  try {
    await apiFetch(`/me/orders/${orderId}/retry-payment`, {
      method: 'POST',
      accessToken,
      locale,
    });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    // Fall through; the page render below will show the new state regardless
  }

  // Revalidate every locale variant of the confirmation page.
  for (const l of routing.locales) {
    revalidatePath(`/${l}/checkout/confirmation/[orderNumber]`, 'page');
  }

  redirect(
    `/${locale}/${locale === 'fr' ? 'commande' : 'checkout'}/confirmation/${encodeURIComponent(orderNumber)}`,
  );
}
