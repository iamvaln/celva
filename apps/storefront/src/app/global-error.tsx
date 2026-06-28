'use client';

import { useEffect } from 'react';
import './globals.css';

/**
 * Last-resort boundary: catches errors thrown by the ROOT layout itself, where
 * no locale/i18n provider exists. It replaces the whole document, so it ships
 * its own <html>/<body> and uses static copy. Normal page errors are handled by
 * the branded [locale]/error.tsx instead.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="bg-background text-foreground">
        <section className="container-celva grid min-h-screen place-items-center py-section-gap">
          <div className="text-center">
            <p className="font-display text-[clamp(72px,12vw,140px)] leading-none text-accent">
              Oups
            </p>
            <p className="mx-auto mt-4 max-w-prose font-body text-lead text-foreground-muted">
              Une erreur est survenue. Réessayez, ou revenez à l’accueil.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={reset} className="btn btn-primary">
                Réessayer
              </button>
              {/* Hard navigation on purpose: force a clean reload out of a
                  catastrophic error state. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="btn btn-ghost">
                Accueil
              </a>
            </div>
          </div>
        </section>
      </body>
    </html>
  );
}
