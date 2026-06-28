import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Monogram } from './Monogram';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeToggle } from './ThemeToggle';

type FooterLink =
  | '/shop'
  | '/collections'
  | '/about'
  | '/process'
  | '/studio'
  | '/journal'
  | '/faq'
  | '/aide'
  | '/size-guides'
  | '/terms'
  | '/privacy'
  | '/contact';

type Column = {
  heading: string;
  links: { href: FooterLink; label: string }[];
};

export const Footer = () => {
  const t = useTranslations('footer');

  const columns: Column[] = [
    {
      heading: t('boutique'),
      links: [
        { href: '/shop', label: t('links.new') },
        { href: '/shop', label: t('links.shop_all') },
        { href: '/collections', label: t('links.collections') },
        { href: '/shop', label: t('links.archive') },
      ],
    },
    {
      heading: t('maison'),
      links: [
        { href: '/about', label: t('links.our_story') },
        { href: '/process', label: t('links.atelier') },
        { href: '/studio', label: t('links.studio') },
        { href: '/journal', label: t('links.journal') },
      ],
    },
    {
      heading: t('help'),
      links: [
        { href: '/size-guides', label: t('links.size_guide') },
        { href: '/aide', label: t('links.shipping') },
        { href: '/aide', label: t('links.care') },
        { href: '/contact', label: t('links.contact_us') },
      ],
    },
    {
      heading: t('contact'),
      links: [
        { href: '/contact', label: t('links.contact_us') },
        { href: '/faq', label: t('links.faq') },
        { href: '/terms', label: t('links.terms') },
        { href: '/privacy', label: t('links.privacy') },
      ],
    },
  ];

  return (
    <footer className="bg-olive-dark text-cream">
      <div className="container-celva pb-8 pt-20">
        <div className="grid gap-10 border-b border-cream/15 pb-12 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
          <div className="flex max-w-xs flex-col gap-4">
            <div className="flex flex-col items-start gap-2 text-cream">
              <Monogram className="h-14 w-14" />
              <span className="font-display text-lg tracking-[0.22em]">CELVA</span>
            </div>
            <p className="font-body text-small leading-relaxed text-cream/70">
              {t('tagline_full')}
            </p>
          </div>
          {columns.map((col) => (
            <FooterColumn key={col.heading} {...col} />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-8 font-body text-small text-cream/60">
          <span>{t('copyright', { year: new Date().getFullYear() })}</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
};

const FooterColumn = ({ heading, links }: Column) => (
  <div>
    <h4 className="mb-4 font-body text-caption font-medium uppercase tracking-[0.2em] text-cream">
      {heading}
    </h4>
    <ul className="flex flex-col gap-2.5">
      {links.map((l, i) => (
        <li key={`${l.href}-${i}`}>
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
