import './globals.css';

type RootLayoutProps = Readonly<{
  // Use React's namespace to bypass the @types/react 18-vs-19 collision —
  // a NS-qualified ReactNode resolves to the storefront-local copy.
  children: React.ReactNode;
}>;

// Passthrough root layout. <html>/<body> live one level down in
// [locale]/layout.tsx so the `lang` attribute is the real locale,
// server-rendered (not patched client-side). The only route rendered
// outside [locale] is the root not-found, which supplies its own document.
// globals.css is imported here so it applies to every route either way.
export default function RootLayout({ children }: RootLayoutProps) {
  return children;
}
