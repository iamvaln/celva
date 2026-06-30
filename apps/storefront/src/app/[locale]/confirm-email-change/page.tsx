import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { apiFetch, ApiError } from '@/lib/api';

/**
 * Public landing page for the link inside the email-change verification
 * email. Confirms the token on render (no client interaction needed),
 * shows success or error, links the user back to /login (because the
 * confirmation revokes all refresh tokens).
 */
export default async function ConfirmEmailChangePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('auth.confirm_email_change');

  let result: { ok: true; email: string } | { ok: false; key: string } = {
    ok: false,
    key: 'missing',
  };

  if (token) {
    try {
      const data = await apiFetch<{ email: string }>('/auth/email-change-confirm', {
        method: 'POST',
        body: { token },
        locale,
      });
      result = { ok: true, email: data.email };
    } catch (err) {
      const key = err instanceof ApiError ? err.key : 'unknown';
      result = { ok: false, key };
    }
  }

  return (
    <div className="container-celva grid place-items-center py-section-gap">
      <div className="w-full max-w-md text-center">
        {result.ok ? (
          <>
            <h1 className="mb-3 font-display text-h1">{t('success_title')}</h1>
            <p className="font-body text-base text-foreground-muted">
              {t('success_body', { email: result.email })}
            </p>
            <p className="mt-8">
              <Link href="/login" className="btn btn-primary">
                {t('login_cta')}
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-3 font-display text-h1">{t('error_title')}</h1>
            <p className="font-body text-base text-foreground-muted">
              {result.key === 'email_already_used'
                ? t('error_email_taken')
                : result.key === 'missing'
                  ? t('error_missing')
                  : t('error_invalid')}
            </p>
            <p className="mt-8 space-x-4">
              <Link href="/account/profile" className="btn btn-secondary">
                {t('back_to_profile')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
