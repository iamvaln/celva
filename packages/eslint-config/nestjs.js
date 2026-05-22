import base from './base.js';

/**
 * NestJS-specific overrides.
 * The `consistent-type-imports` rule is disabled because NestJS DI
 * relies on `emitDecoratorMetadata` — injectable classes referenced in
 * constructor parameters MUST be runtime imports, not `import type`.
 * An auto-fix that converts them to `type` imports silently breaks DI.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...base,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      'no-console': 'off',
    },
  },
];
