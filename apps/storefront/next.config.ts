import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// No fallback — every var must come from .env (see apps/storefront/.env.example).
const API_TARGET = process.env.API_INTERNAL_URL;
if (!API_TARGET) {
  throw new Error(
    'API_INTERNAL_URL is required. Copy apps/storefront/.env.example to apps/storefront/.env and fill it in.',
  );
}

const config: NextConfig = {
  reactStrictMode: true,
  // Browser never calls api.celva.store directly — Next.js proxies /api/v1/* server-side.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_TARGET}/api/:path*` }];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.celva.store' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      // Cloudflare Images Transformations origin (celva.store/cdn-cgi/image/...)
      { protocol: 'https', hostname: 'celva.store', pathname: '/cdn-cgi/image/**' },
      // Local API fallback: the dev API serves /uploads/* directly
      { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/uploads/**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['next-intl'],
  },
  // Security headers (CSP intentionally permissive in dev; tighten via env in prod)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default withNextIntl(config);
