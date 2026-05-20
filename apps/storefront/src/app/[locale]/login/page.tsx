import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { LoginForm } from './LoginForm';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.login');

  return (
    <div className="container-celva grid place-items-center py-section-gap">
      <div className="w-full max-w-md">
        <header className="mb-10 text-center">
          <h1 className="mb-3 font-display text-h1">{t('title')}</h1>
          <p className="font-body text-base text-foreground-muted">{t('subtitle')}</p>
        </header>
        <LoginForm />
        <p className="mt-10 text-center font-body text-small text-foreground-muted">
          {t('no_account')}{' '}
          <Link href="/signup" className="text-accent hover:text-accent-hover">
            {t('signup_link')}
          </Link>
        </p>
      </div>
    </div>
  );
}
