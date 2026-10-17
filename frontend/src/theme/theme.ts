import { createTheme, alpha } from '@mui/material/styles';

const shared = {
  typography: {
    fontFamily: 'var(--font-inter), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' as const, letterSpacing: '0.01em' },
    body2: { lineHeight: 1.6 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingBlock: 8,
          paddingInline: 20,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        sizeLarge: { paddingBlock: 12, fontSize: '1rem', borderRadius: 12 },
        contained: {
          background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: '1.15rem', paddingBottom: 4 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' as const, size: 'small' as const },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1565C0',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700,
            fontSize: '0.75rem',
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
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          marginInline: 8,
          marginBlock: 2,
          '&.Mui-selected': {
            backgroundColor: alpha('#1565C0', 0.08),
            '&:hover': { backgroundColor: alpha('#1565C0', 0.12) },
          },
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: 'light',
    primary: { main: '#1565C0', light: '#42A5F5', dark: '#0D47A1', contrastText: '#fff' },
    secondary: { main: '#7C3AED', light: '#A78BFA', dark: '#5B21B6', contrastText: '#fff' },
    success: { main: '#059669', light: '#34D399', dark: '#047857' },
    error: { main: '#DC2626', light: '#F87171', dark: '#B91C1C' },
    warning: { main: '#D97706', light: '#FBBF24', dark: '#B45309' },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#64748B' },
    divider: '#E2E8F0',
  },
});

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: 'dark',
    primary: { main: '#42A5F5' },
    secondary: { main: '#A78BFA' },
    success: { main: '#34D399' },
    error: { main: '#F87171' },
    warning: { main: '#FBBF24' },
    background: { default: '#0F172A', paper: '#1E293B' },
    text: { primary: '#F1F5F9', secondary: '#94A3B8' },
    divider: '#334155',
  },
});
