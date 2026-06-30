'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { getGuestCart, clearGuestCart } from '@/lib/guest-cart';
import { mergeGuestCartAction } from '@/app/[locale]/cart/actions';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export const LoginForm = () => {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-App-Source': 'WEB_STORE' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        setServerError(res.status === 401 ? t('error_credentials') : t('error_generic'));
        return;
      }
      const payload = (await res.json()) as { data: { accessToken: string } };
      await fetch('/auth/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: payload.data.accessToken }),
      });
      // Merge any guest (localStorage) cart into the now-authenticated server
      // cart, then clear it locally. Best-effort — never blocks the login.
      const guestItems = getGuestCart();
      if (guestItems.length > 0) {
        try {
          await mergeGuestCartAction(
            guestItems.map((it) => ({ variantId: it.variantId, quantity: it.quantity })),
          );
          clearGuestCart();
        } catch {
          /* non-fatal — keep the local cart so nothing is lost */
        }
      }
      router.push('/account');
      router.refresh();
    } catch {
      setServerError(t('error_generic'));
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="mb-2 block font-body text-small text-foreground-muted" htmlFor="email">
          {t('email')}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="input-underline"
          {...register('email')}
        />
        {formState.errors.email ? (
          <p className="mt-1 font-body text-small text-accent">{formState.errors.email.message}</p>
        ) : null}
      </div>
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label className="font-body text-small text-foreground-muted" htmlFor="password">
            {t('password')}
          </label>
          <Link
            href="/forgot-password"
            className="font-body text-small text-foreground-muted hover:text-accent"
          >
            {t('forgot_password_link')}
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="input-underline"
          {...register('password')}
        />
      </div>
      {serverError ? (
        <p role="alert" className="font-body text-small text-accent">
          {serverError}
        </p>
      ) : null}
      <button type="submit" disabled={formState.isSubmitting} className="btn btn-primary btn-block">
        {t('submit')}
      </button>
    </form>
  );
};
