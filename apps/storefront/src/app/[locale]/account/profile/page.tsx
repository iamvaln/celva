import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { ProfileForm } from './ProfileForm';
import { PasswordForm } from './PasswordForm';
import { EmailChangeForm } from './EmailChangeForm';
import { DangerZone } from './DangerZone';
import { readAndClearProfileFlash } from './actions';

type Profile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account.profile_page');

  const accessToken = await getAccessToken();
  if (!accessToken) redirect(`/${locale}/login`);

  let profile: Profile;
  try {
    profile = await apiFetch<Profile>('/auth/me', { locale, accessToken });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect(`/${locale}/login`);
    }
    throw err;
  }

  const flash = await readAndClearProfileFlash();
  const flashOk =
    flash === 'profile_saved' ||
    flash === 'password_changed' ||
    flash === 'email_change_requested';
  const flashError =
    flash && flash.startsWith('error:') ? flash.replace('error:', '') : null;

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva max-w-2xl">
        <header className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="font-display text-h1">{t('title')}</h1>
            <p className="mt-2 font-body text-lead text-foreground-muted">{t('subtitle')}</p>
          </div>
          <Link href="/account" className="btn btn-ghost self-end">
            ← {t('back')}
          </Link>
        </header>

        {flashOk && (
          <div className="mb-8 border border-foreground bg-cream px-4 py-3 font-body text-base text-foreground">
            {t(flash as 'profile_saved' | 'password_changed' | 'email_change_requested')}
          </div>
        )}
        {flashError && (
          <div className="mb-8 border border-accent bg-accent/10 px-4 py-3 font-body text-base text-accent">
            {flashError === 'current_password_invalid'
              ? t('error_current_password')
              : flashError === 'password_too_short'
                ? t('error_password_too_short')
                : flashError === 'invalid_phone'
                  ? t('error_invalid_phone')
                  : flashError === 'invalid_email'
                    ? t('error_invalid_email')
                    : flashError === 'email_already_used'
                      ? t('error_email_taken')
                      : flashError === 'email_unchanged'
                        ? t('error_email_unchanged')
                        : flashError === 'account_has_open_orders'
                          ? t('error_account_has_open_orders')
                          : flashError === 'delete_confirm_required'
                            ? t('error_delete_confirm_required')
                            : t('error_generic')}
          </div>
        )}

        <div className="grid gap-10">
          <section className="border border-border p-6">
            <h2 className="eyebrow mb-4">{t('profile_heading')}</h2>
            <ProfileForm
              locale={locale}
              defaultName={profile.name}
              defaultPhone={profile.phone ?? ''}
            />
          </section>

          <section className="border border-border p-6">
            <h2 className="eyebrow mb-4">{t('email_change_heading')}</h2>
            <p className="mb-4 font-body text-small text-foreground-muted">
              {t('email_change_explainer')}
            </p>
            <EmailChangeForm locale={locale} currentEmail={profile.email} />
          </section>

          <section className="border border-border p-6">
            <h2 className="eyebrow mb-4">{t('password_heading')}</h2>
            <p className="mb-4 font-body text-small text-foreground-muted">
              {t('password_explainer')}
            </p>
            <PasswordForm locale={locale} />
          </section>

          <section className="border border-accent p-6">
            <h2 className="eyebrow mb-1 text-accent">{t('danger_zone_heading')}</h2>
            <p className="mb-6 font-body text-small text-foreground-muted">
              {t('danger_zone_explainer')}
            </p>
            <DangerZone locale={locale} />
          </section>
        </div>
      </div>
    </section>
  );
}
