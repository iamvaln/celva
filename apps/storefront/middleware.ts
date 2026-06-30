import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all paths except API, the non-localized /auth route handlers (e.g.
  // /auth/session, which stashes the access token in an httpOnly cookie — with
  // localePrefix 'always' the i18n middleware would otherwise 307 it to
  // /fr/auth/session, a 404, silently breaking login + guest-checkout sessions),
  // static, and asset routes.
  matcher: ['/((?!api|auth|_next|_vercel|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)'],
};
