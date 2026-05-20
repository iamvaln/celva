'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // next-themes ships React 18 children typing; cast to satisfy React 19's
  // stricter ReactNode while keeping behavior identical.
  const Provider = NextThemesProvider as unknown as React.ComponentType<{
    attribute?: string;
    defaultTheme?: string;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
    children?: ReactNode;
  }>;
  return (
    <Provider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      {children}
    </Provider>
  );
};
