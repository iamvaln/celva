import nestjsConfig from '@celva/eslint-config/nestjs';

export default [
  ...nestjsConfig,
  {
    // `scripts/**` holds local one-off dev scripts (e.g. R2 smoke, demo-order
    // seeders). They're untracked and don't need to follow the strict NestJS
    // rules — keeping them out of lint avoids noise on `turbo run lint`.
    ignores: ['dist/**', 'prisma/migrations/**', 'coverage/**', '*.tsbuildinfo', 'scripts/**'],
  },
];
