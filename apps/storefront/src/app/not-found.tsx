/* eslint-disable @next/next/no-html-link-for-pages */
// Root 404 — the only route rendered outside [locale], so (now that the
// root layout is a passthrough) it must supply its own <html>/<body>.
// The locale-aware 404 in [locale]/not-found.tsx takes precedence whenever
// the path resolves to a valid locale. lang="en" here since the path
// carried no locale and the copy is bilingual.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
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
      </body>
    </html>
  );
}
