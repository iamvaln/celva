import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import {
  createMethodAction,
  deleteMethodAction,
  readAndClearMethodFlash,
  setDefaultMethodAction,
} from './actions';

type SavedMethod = {
  id: string;
  method: 'ORANGE_MONEY' | 'MTN_MOMO';
  label: string;
  phoneNumber: string;
  isDefault: boolean;
  createdAt: string;
};

export default async function PaymentMethodsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account.payment_methods_page');

  const accessToken = await getAccessToken();
  if (!accessToken) redirect(`/${locale}/login`);

  let methods: SavedMethod[] = [];
  try {
    methods = await apiFetch<SavedMethod[]>('/me/payment-methods', {
      locale,
      accessToken,
    });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect(`/${locale}/login`);
    }
    throw err;
  }

  const flash = await readAndClearMethodFlash();
  const flashOk = flash === 'created' || flash === 'deleted' || flash === 'updated';
  const flashError = flash && flash.startsWith('error:') ? flash.replace('error:', '') : null;

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva">
        <header className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="font-display text-h1">{t('title')}</h1>
            <p className="mt-2 max-w-prose font-body text-lead text-foreground-muted">
              {t('subtitle')}
            </p>
          </div>
          <Link href="/account" className="btn btn-ghost self-end">
            ← {t('back')}
          </Link>
        </header>

        {flashOk && (
          <div className="mb-8 border border-foreground bg-cream px-4 py-3 font-body text-base text-foreground">
            {t(flash as 'created' | 'deleted' | 'updated')}
          </div>
        )}
        {flashError && (
          <div className="mb-8 border border-accent bg-accent/10 px-4 py-3 font-body text-base text-accent">
            {t('error_generic')}
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          {/* Existing methods */}
          <section>
            <h2 className="eyebrow mb-4">{t('list_heading')}</h2>
            {methods.length === 0 ? (
              <p className="border border-border bg-background-alt p-6 text-foreground-muted">
                {t('empty')}
              </p>
            ) : (
              <ul className="space-y-4">
                {methods.map((m) => (
                  <li
                    key={m.id}
                    className="border border-border bg-background-alt p-6"
                  >
                    <header className="mb-3 flex items-center justify-between">
                      <p className="font-display text-base text-foreground">
                        {m.label}
                        {m.isDefault && (
                          <span className="ml-3 inline-block border border-accent px-2 py-0.5 font-body text-caption uppercase tracking-eyebrow text-accent">
                            {t('default')}
                          </span>
                        )}
                      </p>
                    </header>
                    <p className="font-body text-base text-foreground">
                      {m.method} · …{m.phoneNumber.slice(-4)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {!m.isDefault && (
                        <form action={setDefaultMethodAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={m.id} />
                          <button
                            type="submit"
                            className="font-body text-small uppercase tracking-eyebrow text-accent hover:underline"
                          >
                            {t('make_default')}
                          </button>
                        </form>
                      )}
                      <form action={deleteMethodAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          className="font-body text-small text-foreground-muted hover:text-accent"
                        >
                          {t('delete')}
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* New method */}
          <section>
            <h2 className="eyebrow mb-4">{t('new_heading')}</h2>
            <form
              action={createMethodAction}
              className="space-y-3 border border-border bg-background-alt p-6"
            >
              <input type="hidden" name="locale" value={locale} />
              <fieldset>
                <legend className="eyebrow mb-2 block">{t('method')}</legend>
                <label className="mr-6 inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="method"
                    value="ORANGE_MONEY"
                    defaultChecked
                  />
                  <span className="font-body text-base text-foreground">
                    {t('orange_money')}
                  </span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="method" value="MTN_MOMO" />
                  <span className="font-body text-base text-foreground">{t('mtn_momo')}</span>
                </label>
              </fieldset>
              <label className="block">
                <span className="eyebrow mb-1 block">{t('label')}</span>
                <input
                  type="text"
                  name="label"
                  required
                  maxLength={60}
                  placeholder={t('label_placeholder')}
                  className="input-underline"
                />
              </label>
              <label className="block">
                <span className="eyebrow mb-1 block">{t('phone')}</span>
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  placeholder="+237698123456"
                  className="input-underline"
                />
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="isDefault" />
                <span className="font-body text-base text-foreground">
                  {t('set_default')}
                </span>
              </label>
              <button type="submit" className="btn btn-primary">
                {t('create')}
              </button>
              <p className="font-body text-caption uppercase tracking-eyebrow text-foreground-muted">
                {t('saved_only_om_mtn')}
              </p>
            </form>
          </section>
        </div>
      </div>
    </section>
  );
}
