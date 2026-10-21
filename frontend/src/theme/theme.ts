import { createTheme, alpha } from '@mui/material/styles';

const shared = {
  typography: {
    fontFamily: 'var(--font-inter), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600, lineHeight: 1.5 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' as const, letterSpacing: '0.01em' },
    body2: { lineHeight: 1.6 },
    caption: { letterSpacing: '0.02em' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingBlock: 8,
          paddingInline: 20,
          boxShadow: 'none',
          fontWeight: 600,
          '&:hover': { boxShadow: 'none' },
        },
        sizeLarge: { paddingBlock: 12, fontSize: '0.875rem', borderRadius: 10, minHeight: 44 },
        contained: {
          '&:hover': { boxShadow: '0 2px 6px 0 rgba(0,0,0,0.08)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
          border: '1px solid #E2E8F0',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: '1.125rem', paddingBottom: 4 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' as const, size: 'small' as const },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#0284c7',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#0284c7',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 9999 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700,
            fontSize: '0.6875rem',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            color: '#64748B',
            borderBottom: '2px solid #E2E8F0',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': { borderBottom: 0 },
          '&:hover': { backgroundColor: 'rgba(248, 250, 252, 0.7)' },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          marginInline: 8,
          marginBlock: 2,
          '&.Mui-selected': {
            backgroundColor: 'rgba(5, 150, 105, 0.12)',
            '&:hover': { backgroundColor: 'rgba(5, 150, 105, 0.18)' },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: 'light',
    primary: { main: '#059669', light: '#D1FAE5', dark: '#047857', contrastText: '#fff' },
    secondary: { main: '#0284C7', light: '#E0F2FE', dark: '#0369A1', contrastText: '#fff' },
    success: { main: '#059669', light: '#D1FAE5', dark: '#047857' },
    error: { main: '#EF4444', light: '#FEE2E2', dark: '#DC2626' },
    warning: { main: '#F59E0B', light: '#FEF3C7', dark: '#D97706' },
    info: { main: '#0284C7', light: '#E0F2FE', dark: '#0369A1' },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#64748B' },
    divider: '#E2E8F0',
  },
});

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: 'dark',
    primary: { main: '#10B981', light: '#064E3B', dark: '#059669' },
    secondary: { main: '#38BDF8', light: '#0C4A6E', dark: '#0284C7' },
    success: { main: '#10B981' },
    error: { main: '#F87171' },
    warning: { main: '#FBBF24' },
    info: { main: '#38BDF8' },
    background: { default: '#0F172A', paper: '#1E293B' },
    text: { primary: '#F1F5F9', secondary: '#94A3B8' },
    divider: '#334155',
  },
});
