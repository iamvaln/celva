'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export const ContactForm = () => {
  const t = useTranslations('static.contact.form');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setStatus('sending');
    try {
      const res = await fetch('/api/v1/contact', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-App-Source': 'WEB_STORE' },
        body: JSON.stringify(values),
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
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <label className="grid gap-1">
        <span className="eyebrow">{t('name')}</span>
        <input
          type="text"
          autoComplete="name"
          className="input-underline"
          aria-invalid={!!formState.errors.name}
          {...register('name')}
        />
      </label>
      <label className="grid gap-1">
        <span className="eyebrow">{t('email')}</span>
        <input
          type="email"
          autoComplete="email"
          className="input-underline"
          aria-invalid={!!formState.errors.email}
          {...register('email')}
        />
      </label>
      <label className="grid gap-1">
        <span className="eyebrow">{t('message')}</span>
        <textarea
          rows={5}
          className="input-underline"
          aria-invalid={!!formState.errors.message}
          {...register('message')}
        />
      </label>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={status === 'sending'} className="btn btn-primary">
          {status === 'sending' ? t('sending') : t('submit')}
        </button>
        {status === 'error' && (
          <span role="alert" className="font-body text-small text-accent">
            {t('error')}
          </span>
        )}
      </div>
    </form>
  );
};
