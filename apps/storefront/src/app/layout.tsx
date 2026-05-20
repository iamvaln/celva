import { bodoniModa, cormorantGaramond } from '@/fonts';
import './globals.css';

type RootLayoutProps = Readonly<{
  // Use React's namespace to bypass the @types/react 18-vs-19 collision —
  // a NS-qualified ReactNode resolves to the storefront-local copy.
  children: React.ReactNode;
}>;

// Root layout. Owns <html>/<body> so Next's static error pages (/404, /500)
// have a valid document. The [locale] layout below renders only chrome +
// providers, no html/body. Lang attribute is updated client-side by the
// LocaleSwitcher when the user changes language (best-effort), and SEO
// hreflang covers the static export.
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${bodoniModa.variable} ${cormorantGaramond.variable}`}>
      <body>{children}</body>
    </html>
  );
}
