'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

const schema = z
  .object({
    newPassword: z.string().min(8),
    confirm: z.string().min(8),
  })
  .refine((d) => d.newPassword === d.confirm, {
    path: ['confirm'],
    message: 'mismatch',
  });

type FormValues = z.infer<typeof schema>;

export const ResetPasswordForm = ({ token }: { token: string }) => {
  const t = useTranslations('auth.reset');
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-App-Source': 'WEB_STORE' },
        body: JSON.stringify({ token, newPassword: values.newPassword }),
      });
      if (!res.ok && res.status !== 204) {
        setServerError(res.status === 400 ? t('error_token') : t('error_generic'));
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setServerError(t('error_generic'));
    }
  };

  if (done) {
    return (
      <div className="border border-foreground bg-cream px-6 py-8 text-center">
        <p className="font-display text-h3 text-foreground">{t('done_title')}</p>
        <p className="mt-3 font-body text-base text-foreground-muted">{t('done_body')}</p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label
          className="mb-2 block font-body text-small text-foreground-muted"
          htmlFor="newPassword"
        >
          {t('new_password')}
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          className="input-underline"
          {...register('newPassword')}
        />
        {formState.errors.newPassword ? (
          <p className="mt-1 font-body text-small text-accent">{t('error_too_short')}</p>
        ) : null}
      </div>
      <div>
        <label
          className="mb-2 block font-body text-small text-foreground-muted"
          htmlFor="confirm"
        >
          {t('confirm_password')}
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          className="input-underline"
          {...register('confirm')}
        />
        {formState.errors.confirm ? (
          <p className="mt-1 font-body text-small text-accent">
            {formState.errors.confirm.message === 'mismatch'
              ? t('error_mismatch')
              : t('error_too_short')}
          </p>
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
    </form>
  );
};
