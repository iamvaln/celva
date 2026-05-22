import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/enums.ts', 'src/i18n.ts', 'src/constants.ts', 'src/types.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2022',
});
