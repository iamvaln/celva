import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, ApiError } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-cookies';
import {
  createAddressAction,
  deleteAddressAction,
  readAndClearAddressFlash,
  updateAddressAction,
} from './actions';

type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  zone: string | null;
  country: string;
  isDefault: boolean;
};

export default async function AddressesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('account.addresses_page');

  const accessToken = await getAccessToken();
  if (!accessToken) redirect(`/${locale}/login`);

  let addresses: Address[] = [];
  try {
    addresses = await apiFetch<Address[]>('/me/addresses', { locale, accessToken });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      redirect(`/${locale}/login`);
    }
    throw err;
  }

  const flash = await readAndClearAddressFlash();
  const flashOk = flash === 'created' || flash === 'updated' || flash === 'deleted';
  const flashError = flash && flash.startsWith('error:') ? flash.replace('error:', '') : null;

  return (
    <section className="bg-background py-section-tight">
      <div className="container-celva">
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
            {t(flash as 'created' | 'updated' | 'deleted')}
          </div>
        )}
        {flashError && (
          <div className="mb-8 border border-accent bg-accent/10 px-4 py-3 font-body text-base text-accent">
            {t('error_generic')}
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          {/* Existing addresses */}
          <section>
            <h2 className="eyebrow mb-4">{t('list_heading')}</h2>
            {addresses.length === 0 ? (
              <p className="border border-border bg-background-alt p-6 text-foreground-muted">
                {t('empty')}
              </p>
            ) : (
              <ul className="space-y-4">
                {addresses.map((a) => (
                  <li key={a.id} className="border border-border bg-background-alt p-6">
                    <header className="mb-3 flex items-center justify-between">
                      <p className="font-display text-base text-foreground">
                        {a.label}
                        {a.isDefault && (
                          <span className="ml-3 inline-block border border-accent px-2 py-0.5 font-body text-caption uppercase tracking-eyebrow text-accent">
                            {t('default')}
                          </span>
                        )}
                      </p>
                    </header>
                    <p className="font-body text-base text-foreground">
                      {a.fullName}
                      <br />
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ''}
                      <br />
                      {a.city}
                      {a.zone ? ` · ${a.zone}` : ''}
                      <br />
                      {a.phone}
                    </p>
                    <details className="mt-4">
                      <summary className="cursor-pointer font-body text-small uppercase tracking-eyebrow text-accent">
                        {t('edit')}
                      </summary>
                      <form action={updateAddressAction} className="mt-4 space-y-3">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={a.id} />
                        <AddressFields defaults={a} t={t} />
                        <button type="submit" className="btn btn-primary">
                          {t('save')}
                        </button>
                      </form>
                    </details>
                    <form action={deleteAddressAction} className="mt-3">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="font-body text-small text-foreground-muted hover:text-accent"
                      >
                        {t('delete')}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* New address */}
          <section>
            <h2 className="eyebrow mb-4">{t('new_heading')}</h2>
            <form action={createAddressAction} className="space-y-3 border border-border bg-background-alt p-6">
              <input type="hidden" name="locale" value={locale} />
              <AddressFields t={t} />
              <button type="submit" className="btn btn-primary">
                {t('create')}
              </button>
            </form>
          </section>
        </div>
      </div>
    </section>
  );
}

function AddressFields({
  defaults,
  t,
}: {
  defaults?: Partial<Address>;
  t: Awaited<ReturnType<typeof getTranslations<'account.addresses_page'>>>;
}) {
  return (
    <>
      <label className="block">
        <span className="eyebrow mb-1 block">{t('label')}</span>
        <input
          type="text"
          name="label"
          defaultValue={defaults?.label ?? ''}
          required
          maxLength={60}
          className="input-underline"
        />
      </label>
      <label className="block">
        <span className="eyebrow mb-1 block">{t('full_name')}</span>
        <input
          type="text"
          name="fullName"
          defaultValue={defaults?.fullName ?? ''}
          required
          maxLength={120}
          className="input-underline"
        />
      </label>
      <label className="block">
        <span className="eyebrow mb-1 block">{t('phone')}</span>
        <input
          type="tel"
          name="phone"
          defaultValue={defaults?.phone ?? ''}
          required
          placeholder="+237698123456"
          className="input-underline"
        />
      </label>
      <label className="block">
        <span className="eyebrow mb-1 block">{t('line1')}</span>
        <input
          type="text"
          name="line1"
          defaultValue={defaults?.line1 ?? ''}
          required
          maxLength={200}
          className="input-underline"
        />
      </label>
      <label className="block">
        <span className="eyebrow mb-1 block">{t('line2')}</span>
        <input
          type="text"
          name="line2"
          defaultValue={defaults?.line2 ?? ''}
          maxLength={200}
          className="input-underline"
        />
      </label>
      <label className="block">
        <span className="eyebrow mb-1 block">{t('city')}</span>
        <input
          type="text"
          name="city"
          defaultValue={defaults?.city ?? 'Douala'}
          required
          maxLength={80}
          className="input-underline"
        />
      </label>
      <label className="block">
        <span className="eyebrow mb-1 block">{t('zone')}</span>
        <input
          type="text"
          name="zone"
          defaultValue={defaults?.zone ?? ''}
          maxLength={80}
          className="input-underline"
        />
      </label>
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={defaults?.isDefault ?? false}
        />
        <span className="font-body text-base text-foreground">{t('set_default')}</span>
      </label>
    </>
  );
}
