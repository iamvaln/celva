import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Monogram } from './Monogram';

export const Footer = () => {
  const t = useTranslations('footer');
  const locale = useLocale();

  return (
    <footer className="bg-olive-dark text-cream">
      <div className="container-celva pb-8 pt-20">
        <div className="grid gap-10 border-b border-cream/15 pb-12 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
          <div className="flex max-w-xs flex-col gap-4">
            <div className="flex flex-col items-start gap-2 text-cream">
              <Monogram className="h-14 w-14" />
              <span className="font-display text-lg tracking-[0.22em]">CELVA</span>
            </div>
            <p className="font-body text-small leading-relaxed text-cream/70">{t('tagline')}</p>
          </div>
          <FooterColumn
            heading={t('boutique')}
            links={[
              { href: '/shop' as const, label: t('links.shop_all') },
              { href: '/shop' as const, label: t('links.new') },
            ]}
          />
          <FooterColumn
            heading={t('about')}
            links={[
              { href: '/about' as const, label: t('links.our_story') },
              { href: '/process' as const, label: t('links.process') },
              { href: '/journal' as const, label: t('links.journal') },
            ]}
          />
          <FooterColumn
            heading={t('help')}
            links={[
              { href: '/faq' as const, label: t('links.faq') },
              { href: '/size-guides' as const, label: t('links.size_guide') },
              { href: '/terms' as const, label: t('links.terms') },
              { href: '/privacy' as const, label: t('links.privacy') },
            ]}
          />
          <FooterColumn
            heading={t('contact')}
            links={[
              { href: '/contact' as const, label: t('links.contact_us') },
              { href: '/aide' as const, label: t('links.shipping') },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-8 text-small text-cream/60">
          <span>{t('copyright', { year: new Date().getFullYear() })}</span>
          <span className="font-body uppercase tracking-eyebrow">{t('payment')}</span>
          <span className="font-body uppercase tracking-eyebrow">{locale.toUpperCase()}</span>
        </div>
      </div>
    </footer>
  );
};

const FooterColumn = ({
  heading,
  links,
}: {
  heading: string;
  links: { href: '/shop' | '/about' | '/process' | '/journal' | '/faq' | '/size-guides' | '/terms' | '/privacy' | '/contact' | '/aide'; label: string }[];
}) => (
  <div>
    <h4 className="mb-4 font-body text-caption font-medium uppercase tracking-[0.2em] text-cream">
      {heading}
    </h4>
    <ul className="flex flex-col gap-2.5">
      {links.map((l) => (
        <li key={`${l.href}-${l.label}`}>
          <Link
            href={l.href}
            className="font-body text-small text-cream/75 transition-colors hover:text-terracotta-light"
          >
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);
