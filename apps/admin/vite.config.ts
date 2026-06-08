import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // vite.config.ts runs in Node, so import.meta.env isn't populated yet —
  // load .env explicitly so VITE_API_URL is visible without needing the
  // shell to export it. No fallback: every var must come from .env.
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL;
  if (!apiUrl) {
    throw new Error(
      'VITE_API_URL is required. Copy apps/admin/.env.example to apps/admin/.env and fill it in.',
    );
  }

  return {
    plugins: [react()],
    server: {
      port: 3002,
      strictPort: false,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 3002,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
      },
    },
  };
});
