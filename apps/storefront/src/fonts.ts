import { Bodoni_Moda, Cormorant_Garamond } from 'next/font/google';

// Bodoni Moda — display (titles, prices, product names). Replaces Didot.
export const bodoniModa = Bodoni_Moda({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  preload: true,
});

// Cormorant Garamond — body (paragraphs, buttons, nav). Replaces Canela.
export const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  preload: true,
});

export const fontVariables = `${bodoniModa.variable} ${cormorantGaramond.variable}`;
