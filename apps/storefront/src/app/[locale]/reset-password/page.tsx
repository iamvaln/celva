import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { ResetPasswordForm } from './ResetPasswordForm';

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('auth.reset');

  if (!token) {
    return (
      <div className="container-celva grid place-items-center py-section-gap">
        <div className="w-full max-w-md text-center">
          <h1 className="mb-3 font-display text-h1">{t('missing_title')}</h1>
          <p className="font-body text-base text-foreground-muted">{t('missing_body')}</p>
          <p className="mt-8">
            <Link href="/forgot-password" className="text-accent hover:text-accent-hover">
              {t('request_new_link')}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-celva grid place-items-center py-section-gap">
      <div className="w-full max-w-md">
        <header className="mb-10 text-center">
          <h1 className="mb-3 font-display text-h1">{t('title')}</h1>
          <p className="font-body text-base text-foreground-muted">{t('subtitle')}</p>
        </header>
        <ResetPasswordForm token={token} />
        <p className="mt-10 text-center font-body text-small text-foreground-muted">
          <Link href="/login" className="text-accent hover:text-accent-hover">
            {t('back_to_login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
