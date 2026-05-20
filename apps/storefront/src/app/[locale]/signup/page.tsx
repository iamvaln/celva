import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { SignupForm } from './SignupForm';

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.signup');

  return (
    <div className="container-celva grid place-items-center py-section-gap">
      <div className="w-full max-w-md">
        <header className="mb-10 text-center">
          <h1 className="mb-3 font-display text-h1">{t('title')}</h1>
          <p className="font-body text-base text-foreground-muted">{t('subtitle')}</p>
        </header>
        <SignupForm />
        <p className="mt-10 text-center font-body text-small text-foreground-muted">
          {t('have_account')}{' '}
          <Link href="/login" className="text-accent hover:text-accent-hover">
            {t('login_link')}
          </Link>
        </p>
      </div>
    </div>
  );
}
