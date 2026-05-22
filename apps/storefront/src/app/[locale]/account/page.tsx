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

type SectionLink = {
  href:
    | '/account/orders'
    | '/account/addresses'
    | '/account/payment-methods'
    | '/account/profile';
  titleKey: 'orders' | 'addresses' | 'payment_methods' | 'profile';
  bodyKey: 'orders_body' | 'addresses_body' | 'payment_methods_body' | 'profile_body';
};

const SECTIONS: SectionLink[] = [
  { href: '/account/orders', titleKey: 'orders', bodyKey: 'orders_body' },
  { href: '/account/addresses', titleKey: 'addresses', bodyKey: 'addresses_body' },
  {
    href: '/account/payment-methods',
    titleKey: 'payment_methods',
    bodyKey: 'payment_methods_body',
  },
  { href: '/account/profile', titleKey: 'profile', bodyKey: 'profile_body' },
];

export default async function AccountDashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account');
  const tAuth = await getTranslations('auth.account');

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
    <section className="bg-background py-section-tight">
      <div className="container-celva">
        <header className="mb-10 max-w-3xl">
          <p className="eyebrow mb-2">{t('eyebrow')}</p>
          <h1 className="font-display text-h1">{tAuth('welcome', { name: profile.name })}</h1>
          <p className="mt-3 font-body text-lead text-foreground-muted">
            {t('subtitle')}
          </p>
        </header>

        {/* Quick profile summary */}
        <section className="mb-10 grid gap-6 border border-border bg-background-alt p-6 sm:grid-cols-3">
          <div>
            <p className="eyebrow mb-1">{tAuth('email_label')}</p>
            <p className="font-display text-base text-foreground">{profile.email}</p>
          </div>
          {profile.phone && (
            <div>
              <p className="eyebrow mb-1">{t('phone_label')}</p>
              <p className="font-display text-base text-foreground">{profile.phone}</p>
            </div>
          )}
          <div>
            <p className="eyebrow mb-1">{tAuth('role_label')}</p>
            <p className="font-display text-base text-foreground">{profile.role}</p>
          </div>
        </section>

        {/* Section cards */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group block border border-border bg-background p-6 transition-colors hover:border-accent"
            >
              <h2 className="mb-2 font-display text-h3 text-foreground group-hover:text-accent">
                {t(section.titleKey)}
              </h2>
              <p className="font-body text-base text-foreground-muted">{t(section.bodyKey)}</p>
              <span className="mt-4 inline-block font-body text-small uppercase tracking-eyebrow text-accent">
                {t('go')} →
              </span>
            </Link>
          ))}
        </section>

        <footer className="mt-12 flex flex-wrap gap-4 border-t border-border pt-8">
          <LogoutButton label={tAuth('logout')} />
          <Link href="/shop" className="btn btn-secondary">
            {tAuth('go_to_shop')}
          </Link>
        </footer>
      </div>
    </section>
  );
}
