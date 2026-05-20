import { celvaTokens } from './tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: celvaTokens.colors,
      fontFamily: celvaTokens.fontFamily,
      borderRadius: celvaTokens.borderRadius,
    },
  },
};
