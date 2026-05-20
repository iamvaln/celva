import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import { LogoutButton } from './LogoutButton';

type Profile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
};

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.account');
  const accessToken = await getAccessToken();
  if (!accessToken) redirect({ href: '/login', locale } as never);

  let profile: Profile;
  try {
    profile = await apiFetch<Profile>('/auth/me', { locale, accessToken });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect({ href: '/login', locale } as never);
    }
    throw err;
  }

  return (
    <div className="container-celva py-section-gap">
      <header className="mb-10">
        <h1 className="font-display text-h1">{t('title')}</h1>
        <p className="mt-2 font-body text-lead text-foreground-muted">
          {t('welcome', { name: profile.name })}
        </p>
      </header>
      <dl className="grid max-w-prose gap-6 font-body sm:grid-cols-2">
        <div>
          <dt className="eyebrow mb-1">{t('email_label')}</dt>
          <dd className="font-display text-base text-foreground">{profile.email}</dd>
        </div>
        <div>
          <dt className="eyebrow mb-1">{t('role_label')}</dt>
          <dd className="font-display text-base text-foreground">{profile.role}</dd>
        </div>
      </dl>
      <div className="mt-12 flex flex-wrap gap-4">
        <LogoutButton label={t('logout')} />
        <Link href="/shop" className="btn btn-secondary">
          {t('go_to_shop')}
        </Link>
      </div>
    </div>
  );
}
