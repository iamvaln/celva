import base from './base.js';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...base,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
];
