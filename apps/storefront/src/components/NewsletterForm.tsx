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

export const NewsletterForm = () => {
  const t = useTranslations('home.newsletter');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setStatus('idle');
    try {
      const res = await fetch('/api/v1/newsletter/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-App-Source': 'WEB_STORE' },
        body: JSON.stringify({ email: values.email }),
      });
      if (!res.ok && res.status !== 204) {
        setStatus('error');
        return;
      }
      setStatus('success');
      reset();
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <p role="status" className="font-body text-base text-foreground">
        {t('success')}
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col items-stretch gap-3 sm:flex-row"
      aria-label={t('title')}
    >
      <label className="sr-only" htmlFor="newsletter-email">
        {t('email_label')}
      </label>
      <input
        id="newsletter-email"
        type="email"
        autoComplete="email"
        placeholder={t('email_placeholder')}
        className="input-underline flex-1 text-center sm:text-left"
        {...register('email')}
      />
      <button type="submit" disabled={formState.isSubmitting} className="btn btn-primary">
        {t('submit')}
      </button>
      {status === 'error' ? (
        <p role="alert" className="font-body text-small text-accent sm:basis-full">
          {t('error')}
        </p>
      ) : null}
    </form>
  );
};
