'use client';

import { useTranslations } from 'next-intl';
import { updateProfileAction } from './actions';

export const ProfileForm = ({
  locale,
  defaultName,
  defaultPhone,
}: {
  locale: 'fr' | 'en';
  defaultName: string;
  defaultPhone: string;
}) => {
  const t = useTranslations('account.profile_page');

  return (
    <form action={updateProfileAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <label className="block">
        <span className="eyebrow mb-1 block">{t('name')}</span>
        <input
          type="text"
          name="name"
          defaultValue={defaultName}
          required
          maxLength={80}
          className="input-underline"
        />
      </label>
      <label className="block">
        <span className="eyebrow mb-1 block">{t('phone')}</span>
        <input
          type="tel"
          name="phone"
          defaultValue={defaultPhone}
          placeholder="+237698123456"
          className="input-underline"
        />
        <span className="mt-1 block font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
          {t('phone_hint')}
        </span>
      </label>
      <button type="submit" className="btn btn-primary">
        {t('save_profile')}
      </button>
    </form>
  );
};
