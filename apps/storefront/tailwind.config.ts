import type { Config } from 'tailwindcss';
import celvaPreset from '@celva/tailwind-config/preset';

const config: Config = {
  presets: [celvaPreset as Config],
  content: [
    './src/app/**/*.{ts,tsx,mdx}',
    './src/components/**/*.{ts,tsx,mdx}',
    './messages/**/*.json',
  ],
};

export default config;
