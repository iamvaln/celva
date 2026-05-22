/* eslint-disable @next/next/no-html-link-for-pages */
// Root 404 — renders inside RootLayout's <html>/<body>. Locale-aware
// 404 inside [locale]/not-found.tsx takes precedence when only the path
// is wrong.
export default function GlobalNotFound() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'grid',
        placeItems: 'center',
        background: '#FAF7F2',
        color: '#595D40',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ fontSize: '8rem', margin: 0, lineHeight: 1 }}>404</p>
        <p style={{ marginTop: '1rem', fontSize: '1.1rem', color: '#8C8680' }}>
          Cette page n&apos;existe pas. / This page doesn&apos;t exist.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '2rem',
            padding: '1rem 2rem',
            border: '1px solid #595D40',
            color: '#595D40',
            textDecoration: 'none',
            fontSize: '0.75rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          Retour · Home
        </a>
      </div>
    </div>
  );
}
