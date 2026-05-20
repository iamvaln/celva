'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PASSWORD_MIN_LENGTH, PHONE_CAMEROON_PATTERN } from '@celva/shared';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || PHONE_CAMEROON_PATTERN.test(v), { message: 'errors.invalid_phone' }),
});

type FormValues = z.infer<typeof schema>;

export const SignupForm = () => {
  const t = useTranslations('auth.signup');
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-App-Source': 'WEB_STORE' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        setServerError(res.status === 409 ? t('error_email_used') : t('error_generic'));
        return;
      }
      const payload = (await res.json()) as { data: { accessToken: string } };
      await fetch('/auth/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: payload.data.accessToken }),
      });
      router.push('/account');
      router.refresh();
    } catch {
      setServerError(t('error_generic'));
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Field id="name" label={t('name')} type="text" autoComplete="name" {...register('name')} error={formState.errors.name?.message} />
      <Field id="email" label={t('email')} type="email" autoComplete="email" {...register('email')} error={formState.errors.email?.message} />
      <Field id="phone" label={t('phone')} type="tel" autoComplete="tel" placeholder="+237699112233" {...register('phone')} error={formState.errors.phone?.message} />
      <div>
        <Field id="password" label={t('password')} type="password" autoComplete="new-password" {...register('password')} error={formState.errors.password?.message} />
        <p className="mt-1 font-body text-small text-foreground-muted">{t('password_hint')}</p>
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

const Field = ({
  id,
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
}) => (
  <div>
    <label htmlFor={id} className="mb-2 block font-body text-small text-foreground-muted">
      {label}
    </label>
    <input id={id} {...props} className="input-underline" />
    {error ? <p className="mt-1 font-body text-small text-accent">{error}</p> : null}
  </div>
);
