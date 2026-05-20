import { defaultTheme } from 'react-admin';
import type { RaThemeOptions } from 'react-admin';

const celvaInk = 'hsl(220 30% 12%)';
const celvaIvory = 'hsl(36 33% 96%)';
const celvaGold = 'hsl(38 65% 50%)';
const celvaRose = 'hsl(348 60% 65%)';

export const celvaLightTheme: RaThemeOptions = {
  ...defaultTheme,
  palette: {
    mode: 'light',
    primary: { main: celvaInk },
    secondary: { main: celvaGold },
    error: { main: celvaRose },
    background: { default: celvaIvory, paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
};

export const celvaDarkTheme: RaThemeOptions = {
  ...defaultTheme,
  palette: {
    mode: 'dark',
    primary: { main: celvaIvory },
    secondary: { main: celvaGold },
    error: { main: celvaRose },
    background: { default: '#0e0e10', paper: '#17171a' },
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
};
