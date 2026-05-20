import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const API_TARGET = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

const config: NextConfig = {
  reactStrictMode: true,
  // Skip static export — the prerender pipeline chokes on our [locale]
  // layout chain (next-intl + theme provider). The app is server-rendered;
  // we'll dial in selective static generation in a polish pass.
  output: 'standalone',
  // Browser never calls api.celva.store directly — Next.js proxies /api/v1/* server-side.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_TARGET}/api/:path*` }];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.celva.store' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
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
