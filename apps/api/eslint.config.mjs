import nestjsConfig from '@celva/eslint-config/nestjs';

export default [
  ...nestjsConfig,
  {
    ignores: ['dist/**', 'prisma/migrations/**', 'coverage/**', '*.tsbuildinfo'],
  },
];
