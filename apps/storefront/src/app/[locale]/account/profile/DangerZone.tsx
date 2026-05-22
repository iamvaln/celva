'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { deleteAccountAction, signOutAllAction } from './actions';

export const DangerZone = ({ locale }: { locale: 'fr' | 'en' }) => {
  const t = useTranslations('account.profile_page');
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* Sign out all devices */}
      <div>
        <h3 className="mb-2 font-display text-base text-foreground">
          {t('signout_all_heading')}
        </h3>
        <p className="mb-4 font-body text-small text-foreground-muted">
          {t('signout_all_explainer')}
        </p>
        <form action={signOutAllAction} className="space-y-3">
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
          <button type="submit" className="btn btn-secondary">
            {t('signout_all_submit')}
          </button>
        </form>
      </div>

      <div className="border-t border-border" />

      {/* Delete account */}
      <div>
        <h3 className="mb-2 font-display text-base text-accent">
          {t('delete_heading')}
        </h3>
        <p className="mb-4 font-body text-small text-foreground-muted">
          {t('delete_explainer')}
        </p>
        {!deleteOpen ? (
          <button
            type="button"
            className="btn btn-secondary border-accent text-accent hover:bg-accent hover:text-foreground-inverse"
            onClick={() => setDeleteOpen(true)}
          >
            {t('delete_open')}
          </button>
        ) : (
          <form action={deleteAccountAction} className="space-y-3">
            <input type="hidden" name="locale" value={locale} />
            <p className="font-body text-small text-foreground">
              {t('delete_final_warning')}
            </p>
            <label className="block">
              <span className="eyebrow mb-1 block">
                {t('delete_confirm_label')}
              </span>
              <input
                type="text"
                name="confirm"
                required
                autoComplete="off"
                placeholder="SUPPRIMER"
                className="input-underline"
              />
              <span className="mt-1 block font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
                {t('delete_confirm_hint')}
              </span>
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
            <div className="flex gap-3">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeleteOpen(false)}
              >
                {t('delete_cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary bg-accent hover:bg-accent-hover"
              >
                {t('delete_submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
