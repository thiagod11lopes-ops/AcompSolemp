import { alpha, createTheme, type ThemeOptions } from '@mui/material/styles'
import { premiumLightTokens, premiumTokens } from './tokens'

function buildComponentOverrides(mode: 'light' | 'dark') {
  const isDark = mode === 'dark'
  const card = isDark ? premiumTokens.card : premiumLightTokens.card
  const border = isDark ? premiumTokens.border : premiumLightTokens.border
  const text = isDark ? premiumTokens.text : premiumLightTokens.text
  const textSecondary = isDark ? premiumTokens.textSecondary : premiumLightTokens.textSecondary
  const primary = premiumTokens.primary

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: isDark ? premiumTokens.gradientBg : premiumLightTokens.bg,
          backgroundAttachment: 'fixed',
        },
        '#root': {
          minHeight: '100vh',
        },
        '::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '::-webkit-scrollbar-thumb': {
          background: isDark ? premiumTokens.line : premiumLightTokens.line,
          borderRadius: 999,
        },
        '::-webkit-scrollbar-track': {
          background: 'transparent',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          borderRadius: premiumTokens.radiusSm,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: isDark ? `0 4px 16px ${alpha(primary, 0.25)}` : 'none',
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${premiumTokens.primary} 0%, ${premiumTokens.primaryDark} 100%)`,
        },
        outlined: {
          borderColor: border,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: premiumTokens.radius,
          border: `1px solid ${border}`,
          boxShadow: isDark ? premiumTokens.shadowSm : '0 4px 20px rgba(15,23,42,0.06)',
        },
        elevation0: {
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: premiumTokens.radius,
          border: `1px solid ${border}`,
          boxShadow: isDark ? premiumTokens.shadowSm : '0 4px 20px rgba(15,23,42,0.06)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            borderColor: isDark ? premiumTokens.borderStrong : border,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(12px)',
          backgroundColor: isDark ? alpha(premiumTokens.card, 0.85) : alpha('#FFFFFF', 0.9),
          borderBottom: `1px solid ${border}`,
        },
        colorInherit: {
          color: text,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: isDark ? premiumTokens.bgElevated : card,
          borderRight: `1px solid ${border}`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: premiumTokens.radiusSm,
          margin: '2px 8px',
          '&.active, &.Mui-selected': {
            backgroundColor: isDark ? alpha(primary, 0.15) : alpha(primary, 0.08),
            borderRight: `3px solid ${primary}`,
          },
          '&:hover': {
            backgroundColor: isDark ? alpha('#FFFFFF', 0.04) : alpha('#000', 0.04),
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: premiumTokens.radiusSm,
            backgroundColor: isDark ? alpha('#000', 0.2) : alpha('#FFF', 0.8),
            '& fieldset': {
              borderColor: border,
            },
            '&:hover fieldset': {
              borderColor: isDark ? premiumTokens.borderStrong : border,
            },
            '&.Mui-focused fieldset': {
              borderColor: primary,
              boxShadow: isDark ? `0 0 0 3px ${alpha(primary, 0.2)}` : undefined,
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: premiumTokens.radiusSm,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        outlined: {
          borderColor: border,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: premiumTokens.radiusSm,
          border: `1px solid ${border}`,
        },
        standardSuccess: {
          backgroundColor: isDark ? alpha(premiumTokens.green, 0.12) : undefined,
          borderColor: alpha(premiumTokens.green, 0.3),
        },
        standardWarning: {
          backgroundColor: isDark ? alpha(premiumTokens.yellow, 0.12) : undefined,
          borderColor: alpha(premiumTokens.yellow, 0.3),
        },
        standardError: {
          backgroundColor: isDark ? alpha(premiumTokens.red, 0.12) : undefined,
          borderColor: alpha(premiumTokens.red, 0.3),
        },
        standardInfo: {
          backgroundColor: isDark ? alpha(premiumTokens.primary, 0.12) : undefined,
          borderColor: alpha(premiumTokens.primary, 0.3),
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: premiumTokens.radius,
          border: `1px solid ${border}`,
          backgroundImage: 'none',
          backgroundColor: card,
          boxShadow: premiumTokens.shadow,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: border,
        },
        head: {
          fontWeight: 700,
          color: textSecondary,
          fontSize: '0.75rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: isDark ? alpha('#FFFFFF', 0.03) : alpha('#000', 0.02),
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 3,
          borderRadius: 999,
          backgroundColor: primary,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          minHeight: 44,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: premiumTokens.radiusSm,
          border: `1px solid ${border}`,
          backgroundImage: 'none',
          backgroundColor: card,
          boxShadow: premiumTokens.shadow,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          backgroundColor: isDark ? premiumTokens.cardHover : '#1E293B',
          border: `1px solid ${border}`,
          fontSize: '0.75rem',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 8,
          backgroundColor: isDark ? alpha('#FFF', 0.06) : alpha('#000', 0.06),
        },
        bar: {
          borderRadius: 999,
          background: `linear-gradient(90deg, ${premiumTokens.primary}, ${premiumTokens.primaryLight})`,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: border,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'background-color 0.15s ease, transform 0.15s ease',
          '&:hover': {
            backgroundColor: isDark ? alpha('#FFF', 0.06) : alpha('#000', 0.04),
          },
        },
      },
    },
  }
}

const baseTypography: ThemeOptions['typography'] = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h4: { fontWeight: 700, letterSpacing: '-0.02em' },
  h5: { fontWeight: 600, letterSpacing: '-0.01em' },
  h6: { fontWeight: 600 },
  subtitle1: { fontWeight: 600 },
  button: { fontWeight: 600 },
}

export const darkTheme = createTheme({
  typography: baseTypography,
  shape: { borderRadius: premiumTokens.radiusSm },
  palette: {
    mode: 'dark',
    primary: {
      main: premiumTokens.primary,
      light: premiumTokens.primaryLight,
      dark: premiumTokens.primaryDark,
    },
    secondary: { main: premiumTokens.purple },
    success: { main: premiumTokens.green },
    warning: { main: premiumTokens.yellow },
    error: { main: premiumTokens.red },
    info: { main: premiumTokens.primary },
    background: {
      default: premiumTokens.bg,
      paper: premiumTokens.card,
    },
    text: {
      primary: premiumTokens.text,
      secondary: premiumTokens.textSecondary,
    },
    divider: premiumTokens.border,
    action: {
      selected: alpha(premiumTokens.primary, 0.15),
      hover: alpha('#FFFFFF', 0.04),
    },
  },
  components: buildComponentOverrides('dark'),
})

export const lightTheme = createTheme({
  typography: baseTypography,
  shape: { borderRadius: premiumTokens.radiusSm },
  palette: {
    mode: 'light',
    primary: {
      main: premiumTokens.primaryDark,
      light: premiumTokens.primary,
      dark: '#1D4ED8',
    },
    secondary: { main: premiumTokens.purple },
    success: { main: '#16A34A' },
    warning: { main: '#D97706' },
    error: { main: '#DC2626' },
    info: { main: premiumTokens.primary },
    background: {
      default: premiumLightTokens.bg,
      paper: premiumLightTokens.card,
    },
    text: {
      primary: premiumLightTokens.text,
      secondary: premiumLightTokens.textSecondary,
    },
    divider: premiumLightTokens.border,
  },
  components: buildComponentOverrides('light'),
})
