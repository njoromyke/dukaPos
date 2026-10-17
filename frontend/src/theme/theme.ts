import { createTheme } from '@mui/material/styles';

const shared = {
  typography: {
    fontFamily: 'var(--font-inter), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 800 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 700, textTransform: 'none' as const },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, paddingBlock: 8, paddingInline: 20 },
        sizeLarge: { paddingBlock: 12, fontSize: '1rem' },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 14 } },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 14 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16 } },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' as const, size: 'small' as const },
    },
  },
};

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: 'light',
    primary: { main: '#1565C0', contrastText: '#fff' },
    secondary: { main: '#2E7D32', contrastText: '#fff' },
    error: { main: '#C62828' },
    warning: { main: '#E65100' },
    background: { default: '#F5F5F5', paper: '#FFFFFF' },
  },
});

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: 'dark',
    primary: { main: '#42A5F5' },
    secondary: { main: '#66BB6A' },
    error: { main: '#EF5350' },
    warning: { main: '#FF9800' },
    background: { default: '#121212', paper: '#1E1E1E' },
  },
});
