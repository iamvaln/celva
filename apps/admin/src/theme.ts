import { defaultTheme } from 'react-admin';
import type { RaThemeOptions } from 'react-admin';
import { celvaColors } from '@celva/tailwind-config/tokens';

const fontStack = '"Cormorant Garamond", "Garamond", Georgia, serif';
const displayStack = '"Bodoni Moda", "Didot", "Times New Roman", serif';

export const celvaLightTheme: RaThemeOptions = {
  ...defaultTheme,
  palette: {
    mode: 'light',
    primary: { main: celvaColors.olive.DEFAULT, contrastText: celvaColors.cream },
    secondary: { main: celvaColors.terracotta.DEFAULT, contrastText: celvaColors.cream },
    error: { main: celvaColors.terracotta.dark },
    background: { default: celvaColors.cream, paper: celvaColors.beige.light },
    text: { primary: celvaColors.olive.DEFAULT, secondary: celvaColors.gray.DEFAULT },
    divider: celvaColors.beige.dark,
  },
  typography: {
    fontFamily: fontStack,
    h1: { fontFamily: displayStack, fontWeight: 700 },
    h2: { fontFamily: displayStack, fontWeight: 400 },
    h3: { fontFamily: displayStack, fontWeight: 400 },
    h4: { fontFamily: displayStack, fontWeight: 400 },
    h5: { fontFamily: displayStack, fontWeight: 400 },
    h6: { fontFamily: displayStack, fontWeight: 500 },
    button: { fontFamily: fontStack, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase' },
  },
  shape: { borderRadius: 0 },
};

export const celvaDarkTheme: RaThemeOptions = {
  ...defaultTheme,
  palette: {
    mode: 'dark',
    primary: { main: celvaColors.cream, contrastText: celvaColors.ink },
    secondary: { main: celvaColors.terracotta.DEFAULT, contrastText: celvaColors.cream },
    error: { main: celvaColors.terracotta.light },
    background: { default: celvaColors.ink, paper: celvaColors['ink-surface'] },
    text: { primary: celvaColors.cream, secondary: celvaColors.gray.light },
    divider: celvaColors['ink-border'],
  },
  typography: {
    fontFamily: fontStack,
    h1: { fontFamily: displayStack, fontWeight: 700 },
    h2: { fontFamily: displayStack, fontWeight: 400 },
    h3: { fontFamily: displayStack, fontWeight: 400 },
    h4: { fontFamily: displayStack, fontWeight: 400 },
    h5: { fontFamily: displayStack, fontWeight: 400 },
    h6: { fontFamily: displayStack, fontWeight: 500 },
    button: { fontFamily: fontStack, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase' },
  },
  shape: { borderRadius: 0 },
};
