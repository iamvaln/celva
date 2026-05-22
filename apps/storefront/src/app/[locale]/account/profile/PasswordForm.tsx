'use client';

import { useTranslations } from 'next-intl';
import { changePasswordAction } from './actions';

export const PasswordForm = ({ locale }: { locale: 'fr' | 'en' }) => {
  const t = useTranslations('account.profile_page');

  return (
    <form action={changePasswordAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <label className="block">
        <span className="eyebrow mb-1 block">{t('current_password')}</span>
        <input
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          required
          className="input-underline"
        />
      </label>
      <label className="block">
        <span className="eyebrow mb-1 block">{t('new_password')}</span>
        <input
          type="password"
          name="newPassword"
          autoComplete="new-password"
          required
          minLength={8}
          className="input-underline"
        />
      </label>
      <label className="block">
        <span className="eyebrow mb-1 block">{t('confirm_password')}</span>
        <input
          type="password"
          name="confirm"
          autoComplete="new-password"
          required
          minLength={8}
          className="input-underline"
        />
      </label>
      <button type="submit" className="btn btn-primary">
        {t('save_password')}
      </button>
    </form>
  );
};
