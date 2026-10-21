import { createContext, useContext, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Layout } from '@/constants/Layout';
import { useThemeStore } from '@/stores';

export interface AppTheme {
  dark: boolean;
  colors: {
    primary: string;
    primaryLight: string;
    secondary: string;
    secondaryLight: string;
    accent: string;
    accentLight: string;
    danger: string;
    dangerLight: string;
    background: string;
    surface: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    gradient: readonly [string, string];
    gradientDark: readonly [string, string];
  };
  fonts: typeof fonts;
  spacing: typeof Layout.spacing;
  radius: typeof Layout.radius;
  typography: typeof typography;
}

const fonts = {
  headline: 'SpaceGrotesk_700Bold',
  headlineMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

const typography = {
  displayLg: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40, fontFamily: fonts.headline },
  displayMd: { fontSize: 28, fontWeight: '800' as const, lineHeight: 36, fontFamily: fonts.headline },
  displaySm: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, fontFamily: fonts.headline },
  headlineLg: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28, fontFamily: fonts.headline },
  headlineMd: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26, fontFamily: fonts.headline },
  headlineSm: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24, fontFamily: fonts.headline },
  titleLg: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24, fontFamily: fonts.bodySemiBold },
  titleMd: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22, fontFamily: fonts.bodySemiBold },
  titleSm: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, fontFamily: fonts.bodySemiBold },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, fontFamily: fonts.body },
  bodyMd: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, fontFamily: fonts.body },
  bodySm: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18, fontFamily: fonts.body },
  labelLg: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, fontFamily: fonts.bodySemiBold },
  labelMd: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, fontFamily: fonts.bodySemiBold },
  labelSm: { fontSize: 11, fontWeight: '600' as const, lineHeight: 16, fontFamily: fonts.bodySemiBold },
} as const;

function buildTheme(isDark: boolean): AppTheme {
  const palette = isDark ? Colors.dark : Colors.light;
  return {
    dark: isDark,
    colors: {
      primary: palette.primary,
      primaryLight: palette.primaryLight,
      secondary: palette.secondary,
      secondaryLight: palette.secondaryLight,
      accent: palette.accent,
      accentLight: palette.accentLight,
      danger: palette.danger,
      dangerLight: palette.dangerLight,
      background: palette.background,
      surface: palette.surface,
      surfaceContainer: palette.surfaceContainer,
      surfaceContainerHigh: palette.surfaceContainerHigh,
      text: palette.text,
      textSecondary: palette.textSecondary,
      textTertiary: palette.textTertiary,
      border: palette.border,
      gradient: palette.gradient,
      gradientDark: palette.gradientDark,
    },
    fonts,
    spacing: Layout.spacing,
    radius: Layout.radius,
    typography,
  };
}

const ThemeContext = createContext<AppTheme>(buildTheme(false));

export function ThemeProvider({ children }: PropsWithChildren) {
  const mode = useThemeStore((s) => s.mode);
  const theme = buildTheme(mode === 'dark');
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  return useContext(ThemeContext);
}
