'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { applyPromoAction, type PromoActionResult } from './actions';

type Props = {
  /** Code already persisted in the cookie (re-validated server-side on render). */
  appliedCode: string | null;
};

/**
 * Single input + Apply button. On submit, calls the server action which:
 *  - returns { ok: true, code, discount, subtotalAfter } on success
 *  - returns { ok: false, error } with the API i18n key on failure
 *
 * On success, the page is revalidated so the summary block re-renders with
 * the new discount line. We still show the success state inline as a hint.
 */
export const PromoCodeInput = ({ appliedCode }: Props) => {
  const t = useTranslations('cart.promo');
  const [state, formAction, pending] = useActionState<PromoActionResult | null, FormData>(
    applyPromoAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-2">
      <label className="eyebrow block" htmlFor="promo-code">
        {t('label')}
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id="promo-code"
          name="code"
          type="text"
          defaultValue={appliedCode ?? ''}
          placeholder={t('placeholder')}
          autoComplete="off"
          autoCapitalize="characters"
          className="input-underline flex-1"
          disabled={pending}
        />
        <button type="submit" className="btn btn-ghost" disabled={pending}>
          {pending ? t('checking') : t('apply')}
        </button>
      </div>
      {state?.ok && state.code && (
        <p className="font-body text-caption uppercase tracking-eyebrow text-accent">
          {t('applied', { code: state.code })}
        </p>
      )}
      {state && state.ok === false && state.error && (
        <p className="font-body text-caption uppercase tracking-eyebrow text-accent">
          {translateError(t, state.error)}
        </p>
      )}
    </form>
  );
};

/**
 * Maps the API error key (i18n) onto the storefront's local namespace. The
 * API returns translated strings via Accept-Language, but here we want
 * storefront-controlled copy so the wording lines up with the cart UX.
 */
const translateError = (t: ReturnType<typeof useTranslations>, key: string): string => {
  if (key.startsWith('errors.')) {
    const sub = key.replace('errors.', '');
    if (sub === 'invalid_promo_code') return t('errors.invalid');
    if (sub === 'promo_code_exhausted') return t('errors.exhausted');
    if (sub === 'promo_code_min_order') return t('errors.min_order');
    if (sub === 'promo_code_user_limit') return t('errors.user_limit');
    if (sub === 'invalid_promo_code_format') return t('errors.format');
  }
  return t('errors.unknown');
};
