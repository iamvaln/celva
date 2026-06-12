import { defaultTheme } from 'react-admin';
import type { RaThemeOptions } from 'react-admin';
import type { Theme } from '@mui/material/styles';
import { celvaColors } from '@celva/tailwind-config/tokens';

const fontStack = '"Cormorant Garamond", "Garamond", Georgia, serif';
const displayStack = '"Bodoni Moda", "Didot", "Times New Roman", serif';

export const celvaLightTheme: RaThemeOptions = {
  ...defaultTheme,
  palette: {
    mode: 'light',
    // Neutral default (redesign): near black-and-white surfaces, terracotta
    // as the lone action accent. Warm brand palette is opt-in (data-palette).
    primary: { main: celvaColors.terracotta.DEFAULT, contrastText: celvaColors.cream },
    secondary: { main: celvaColors.olive.DEFAULT, contrastText: celvaColors.cream },
    error: { main: '#BC5249' },
    background: { default: '#F4F4F2', paper: '#FFFFFF' },
    text: { primary: '#232320', secondary: '#65635E' },
    divider: '#E0DFDB',
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
  components: {
    // Dense tables by default — back-office tools live on this surface, and
    // the airy MUI default makes long lists slow to scan.
    MuiTable: { defaultProps: { size: 'small' } },
    // Sidebar reads as the white "surface" column with a right border,
    // distinct from the gray main area (design: .side vs .main).
    RaSidebar: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
          '& .RaSidebar-fixed': { backgroundColor: theme.palette.background.paper },
        }),
      },
    },
  },
};

export const celvaDarkTheme: RaThemeOptions = {
  ...defaultTheme,
  palette: {
    mode: 'dark',
    primary: { main: celvaColors.terracotta.light, contrastText: celvaColors.ink },
    secondary: { main: celvaColors.olive.light, contrastText: celvaColors.cream },
    error: { main: '#CB675D' },
    background: { default: '#151514', paper: '#201F1E' },
    text: { primary: '#ECEBE7', secondary: '#9C9A93' },
    divider: '#34332F',
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
  components: {
    // Dense tables by default — back-office tools live on this surface, and
    // the airy MUI default makes long lists slow to scan.
    MuiTable: { defaultProps: { size: 'small' } },
    // Sidebar reads as the white "surface" column with a right border,
    // distinct from the gray main area (design: .side vs .main).
    RaSidebar: {
      styleOverrides: {
        root: ({ theme }: { theme: Theme }) => ({
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
          '& .RaSidebar-fixed': { backgroundColor: theme.palette.background.paper },
        }),
      },
    },
  },
};
