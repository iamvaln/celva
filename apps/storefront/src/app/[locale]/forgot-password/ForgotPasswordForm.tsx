'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

const schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export const ForgotPasswordForm = () => {
  const t = useTranslations('auth.forgot');
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      // API always returns 204 — we just need to know the call landed.
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-App-Source': 'WEB_STORE' },
        body: JSON.stringify(values),
      });
      if (!res.ok && res.status !== 204) {
        setServerError(t('error_generic'));
        return;
      }
      setSent(true);
    } catch {
      setServerError(t('error_generic'));
    }
  };

  if (sent) {
    return (
      <div className="border border-foreground bg-cream px-6 py-8 text-center">
        <p className="font-display text-h3 text-foreground">{t('sent_title')}</p>
        <p className="mt-3 font-body text-base text-foreground-muted">{t('sent_body')}</p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label
          className="mb-2 block font-body text-small text-foreground-muted"
          htmlFor="email"
        >
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
          <p className="mt-1 font-body text-small text-accent">{t('error_email')}</p>
        ) : null}
      </div>
      {serverError ? (
        <p role="alert" className="font-body text-small text-accent">
          {serverError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={formState.isSubmitting}
        className="btn btn-primary btn-block"
      >
        {t('submit')}
      </button>
      <p className="font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
        {t('hint')}
      </p>
    </form>
  );
};
