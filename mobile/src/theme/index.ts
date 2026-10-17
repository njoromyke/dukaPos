import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  displayLarge: { fontFamily: 'System', fontWeight: '800' as const },
  displayMedium: { fontFamily: 'System', fontWeight: '700' as const },
  headlineLarge: { fontFamily: 'System', fontWeight: '700' as const },
  headlineMedium: { fontFamily: 'System', fontWeight: '600' as const },
  titleLarge: { fontFamily: 'System', fontWeight: '600' as const },
  titleMedium: { fontFamily: 'System', fontWeight: '600' as const },
  bodyLarge: { fontFamily: 'System', fontWeight: '400' as const },
  bodyMedium: { fontFamily: 'System', fontWeight: '400' as const },
  labelLarge: { fontFamily: 'System', fontWeight: '600' as const },
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1565C0',
    primaryContainer: '#E3F2FD',
    secondary: '#2E7D32',
    secondaryContainer: '#E8F5E9',
    tertiary: '#E65100',
    tertiaryContainer: '#FFF3E0',
    error: '#C62828',
    errorContainer: '#FFEBEE',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F0F0',
    outline: '#BDBDBD',
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#42A5F5',
    primaryContainer: '#0D47A1',
    secondary: '#66BB6A',
    secondaryContainer: '#1B5E20',
    tertiary: '#FF9800',
    tertiaryContainer: '#E65100',
    error: '#EF5350',
    errorContainer: '#B71C1C',
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2C2C2C',
    outline: '#424242',
  },
  fonts: configureFonts({ config: fontConfig }),
};
