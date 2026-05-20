type ColorWithVariants = {
  DEFAULT: string;
  light: string;
  dark: string;
};

export declare const celvaColors: {
  terracotta: ColorWithVariants;
  beige: ColorWithVariants;
  olive: ColorWithVariants;
  cream: string;
  ink: string;
  'ink-surface': string;
  'ink-border': string;
  gray: ColorWithVariants;
  whatsapp: string;
};

export declare const celvaSemantic: Record<string, string>;
export declare const celvaFontFamily: Record<string, string[]>;
export declare const celvaFontSize: Record<string, [string, { lineHeight: string; letterSpacing?: string }]>;
export declare const celvaLetterSpacing: Record<string, string>;
export declare const celvaSpacing: Record<string, string>;
export declare const celvaBorderRadius: Record<string, string>;
export declare const celvaBoxShadow: Record<string, string>;
export declare const celvaScreens: Record<'sm' | 'md' | 'lg' | 'xl', string>;
export declare const celvaContainer: {
  center: boolean;
  screens: Record<string, string>;
  padding: Record<string, string>;
};
export declare const celvaTransition: Record<string, string>;
export declare const celvaPatternOpacity: string;
