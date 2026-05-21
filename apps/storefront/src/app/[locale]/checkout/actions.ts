'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { routing } from '@/i18n/routing';

const PROMO_COOKIE = 'celva.promo';
const CHECKOUT_ERROR_COOKIE = 'celva.checkout_error';

const stringOrUndefined = (v: FormDataEntryValue | null): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const ALLOWED_DELIVERY_MODES = new Set([
  'HOME_DELIVERY',
  'STORE_PICKUP',
  'RELAY_PICKUP',
]);
const ALLOWED_PAYMENT_METHODS = new Set([
  'ORANGE_MONEY',
  'MTN_MOMO',
  'CASH_ON_DELIVERY',
]);

/**
 * Submits the checkout form to /me/orders. On success the user is
 * redirected to /commande/confirmation/<orderNumber>; on failure we stash
 * a one-shot error key in a cookie that the checkout page reads on the
 * next render to display the message inline.
 */
export async function placeOrderAction(formData: FormData): Promise<void> {
  const locale = (stringOrUndefined(formData.get('locale')) ?? 'fr') as 'fr' | 'en';
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect(`/${locale}/login?next=/${locale}/checkout`);
  }

  const deliveryMode = stringOrUndefined(formData.get('deliveryMode'));
  const paymentMethod = stringOrUndefined(formData.get('paymentMethod'));
  if (!deliveryMode || !ALLOWED_DELIVERY_MODES.has(deliveryMode)) {
    await stashError('errors.invalid_delivery_mode');
    redirect(`/${locale}/checkout`);
  }
  if (!paymentMethod || !ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
    await stashError('errors.invalid_payment_method');
    redirect(`/${locale}/checkout`);
  }

  const body: Record<string, unknown> = {
    deliveryMode,
    paymentMethod,
  };

  if (deliveryMode === 'HOME_DELIVERY') {
    body.deliveryZoneId = stringOrUndefined(formData.get('deliveryZoneId'));
    const savedAddressId = stringOrUndefined(formData.get('shippingAddressId'));
    if (savedAddressId) {
      body.shippingAddressId = savedAddressId;
    } else {
      body.shippingAddress = stringOrUndefined(formData.get('shippingAddress'));
      body.shippingCity = stringOrUndefined(formData.get('shippingCity'));
      body.shippingPhone = stringOrUndefined(formData.get('shippingPhone'));
    }
  } else {
    body.pickupPointId = stringOrUndefined(formData.get('pickupPointId'));
  }

  if (paymentMethod === 'ORANGE_MONEY' || paymentMethod === 'MTN_MOMO') {
    const savedId = stringOrUndefined(formData.get('savedPaymentMethodId'));
    if (savedId) {
      body.savedPaymentMethodId = savedId;
    } else {
      body.paymentPhoneNumber = stringOrUndefined(formData.get('paymentPhoneNumber'));
    }
  }

  const promo = stringOrUndefined(formData.get('promoCode'));
  if (promo) body.promoCode = promo;
  const notes = stringOrUndefined(formData.get('notes'));
  if (notes) body.notes = notes;

  let order: { orderNumber: string };
  try {
    order = await apiFetch<{ orderNumber: string }>('/me/orders', {
      method: 'POST',
      body,
      accessToken,
      locale,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      await stashError(err.key);
    } else {
      await stashError('errors.unknown');
    }
    redirect(`/${locale}/checkout`);
  }

  // Success: drop the promo cookie (one-shot) + the error cookie.
  await clearCookie(PROMO_COOKIE);
  await clearCookie(CHECKOUT_ERROR_COOKIE);
  // Revalidate cart-aware pages across both locales so the storefront
  // reflects the cleared cart immediately.
  await Promise.resolve(); // serialize redirect side-effects
  for (const l of routing.locales) {
    // revalidateTag-like helpers would be cleaner; for now this is a no-op
    // since the redirect itself triggers a fresh fetch.
    void l;
  }
  redirect(`/${locale}/commande/confirmation/${encodeURIComponent(order.orderNumber)}`);
}

const stashError = async (key: string): Promise<void> => {
  const store = await cookies();
  store.set(CHECKOUT_ERROR_COOKIE, key, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60, // one minute window — the next page render consumes it
  });
};

const clearCookie = async (name: string): Promise<void> => {
  const store = await cookies();
  store.delete(name);
};

export const readAndClearCheckoutError = async (): Promise<string | null> => {
  const store = await cookies();
  const value = store.get(CHECKOUT_ERROR_COOKIE)?.value ?? null;
  if (value) store.delete(CHECKOUT_ERROR_COOKIE);
  return value;
};
