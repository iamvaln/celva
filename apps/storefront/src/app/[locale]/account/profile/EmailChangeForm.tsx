'use client';

import { useTranslations } from 'next-intl';
import { requestEmailChangeAction } from './actions';

export const EmailChangeForm = ({
  locale,
  currentEmail,
}: {
  locale: 'fr' | 'en';
  currentEmail: string;
}) => {
  const t = useTranslations('account.profile_page');

  return (
    <form action={requestEmailChangeAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <p className="font-body text-small text-foreground-muted">
        {t('email_change_current')}: <strong>{currentEmail}</strong>
      </p>
      <label className="block">
        <span className="eyebrow mb-1 block">{t('email_change_new')}</span>
        <input
          type="email"
          name="newEmail"
          required
          autoComplete="email"
          className="input-underline"
        />
      </label>
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
      <button type="submit" className="btn btn-primary">
        {t('email_change_submit')}
      </button>
      <p className="font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
        {t('email_change_hint')}
      </p>
    </form>
  );
};
