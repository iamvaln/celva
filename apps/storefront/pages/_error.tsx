// Legacy Pages Router fallback. Next 15 + next-intl still generates a
// static /_error during export and the App Router error pipeline can't
// satisfy it without rendering objects-as-children. This shim gives the
// exporter a simple component that always returns a string body, no
// imports, no JSX nesting that could trip up the serializer.
export default function ErrorPage({ statusCode }: { statusCode: number }) {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        background: '#FAF7F2',
        color: '#595D40',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '6rem', margin: 0, lineHeight: 1 }}>{statusCode ?? 'Erreur'}</p>
        <p style={{ marginTop: '1rem', color: '#8C8680' }}>
          {statusCode === 404
            ? "Cette page n'existe pas. / This page doesn't exist."
            : 'Une erreur est survenue. / Something went wrong.'}
        </p>
      </div>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: { res?: { statusCode?: number }; err?: { statusCode?: number } }) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
  return { statusCode };
};
