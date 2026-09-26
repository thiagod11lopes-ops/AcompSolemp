import { alpha, createTheme, type ThemeOptions } from '@mui/material/styles'
import { premiumLightTokens, premiumTokens } from './tokens'

function buildComponentOverrides(mode: 'light' | 'dark') {
  const isDark = mode === 'dark'
  const card = isDark ? premiumTokens.card : premiumLightTokens.card
  const border = isDark ? premiumTokens.border : premiumLightTokens.border
  const text = isDark ? premiumTokens.text : premiumLightTokens.text
  const textSecondary = isDark ? premiumTokens.textSecondary : premiumLightTokens.textSecondary
  const primary = premiumTokens.primary
  const bg = isDark ? premiumTokens.bg : premiumLightTokens.bg

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: bg,
          backgroundImage: isDark ? premiumTokens.gradientBg : 'none',
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
          letterSpacing: '-0.01em',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: primary,
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: premiumTokens.primaryDark,
          },
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
          boxShadow: isDark
            ? premiumTokens.shadowSm
            : '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
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
          boxShadow: isDark
            ? premiumTokens.shadowSm
            : '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: isDark ? premiumTokens.borderStrong : premiumLightTokens.borderStrong,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'saturate(180%) blur(16px)',
          backgroundColor: isDark ? alpha(premiumTokens.card, 0.82) : alpha('#FFFFFF', 0.78),
          borderBottom: `1px solid ${border}`,
          boxShadow: 'none',
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
          backgroundColor: isDark ? premiumTokens.bgElevated : '#FFFFFF',
          borderRight: `1px solid ${border}`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: premiumTokens.radiusSm,
          margin: '2px 10px',
          minHeight: 40,
          '&.active, &.Mui-selected': {
            backgroundColor: isDark ? alpha(primary, 0.16) : alpha(primary, 0.1),
            color: isDark ? premiumTokens.text : premiumTokens.primaryDark,
            borderRight: 'none',
            '& .MuiListItemIcon-root': {
              color: primary,
            },
          },
          '&:hover': {
            backgroundColor: isDark ? alpha('#FFFFFF', 0.05) : alpha('#000', 0.04),
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: premiumTokens.radiusSm,
            backgroundColor: isDark ? alpha('#000', 0.25) : alpha('#F5F5F7', 0.9),
            '& fieldset': {
              borderColor: border,
            },
            '&:hover fieldset': {
              borderColor: isDark ? premiumTokens.borderStrong : premiumLightTokens.borderStrong,
            },
            '&.Mui-focused fieldset': {
              borderColor: primary,
              boxShadow: `0 0 0 3px ${alpha(primary, 0.18)}`,
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
          borderRadius: 8,
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
          backgroundColor: isDark ? alpha(premiumTokens.green, 0.12) : alpha(premiumTokens.green, 0.08),
          borderColor: alpha(premiumTokens.green, 0.28),
        },
        standardWarning: {
          backgroundColor: isDark
            ? alpha(premiumTokens.yellow, 0.12)
            : alpha(premiumTokens.orange, 0.1),
          borderColor: alpha(premiumTokens.orange, 0.28),
        },
        standardError: {
          backgroundColor: isDark ? alpha(premiumTokens.red, 0.12) : alpha(premiumTokens.red, 0.08),
          borderColor: alpha(premiumTokens.red, 0.28),
        },
        standardInfo: {
          backgroundColor: isDark
            ? alpha(premiumTokens.primary, 0.12)
            : alpha(premiumTokens.primary, 0.08),
          borderColor: alpha(premiumTokens.primary, 0.28),
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: `1px solid ${border}`,
          backgroundImage: 'none',
          backgroundColor: card,
          boxShadow: isDark
            ? premiumTokens.shadow
            : '0 24px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: border,
        },
        head: {
          fontWeight: 600,
          color: textSecondary,
          fontSize: '0.72rem',
          letterSpacing: '0.04em',
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
          minHeight: 42,
        },
        indicator: {
          height: 2,
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
          minHeight: 42,
          letterSpacing: '-0.01em',
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
          boxShadow: isDark
            ? premiumTokens.shadow
            : '0 12px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          backgroundColor: isDark ? premiumTokens.cardHover : '#1D1D1F',
          border: `1px solid ${border}`,
          fontSize: '0.75rem',
          fontWeight: 500,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 6,
          backgroundColor: isDark ? alpha('#FFF', 0.08) : alpha('#000', 0.06),
        },
        bar: {
          borderRadius: 999,
          backgroundColor: primary,
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
          transition: 'background-color 0.15s ease',
          '&:hover': {
            backgroundColor: isDark ? alpha('#FFF', 0.06) : alpha('#000', 0.05),
          },
        },
      },
    },
  }
}

const baseTypography: ThemeOptions['typography'] = {
  fontFamily:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif',
  h4: { fontWeight: 700, letterSpacing: '-0.035em' },
  h5: { fontWeight: 700, letterSpacing: '-0.03em' },
  h6: { fontWeight: 600, letterSpacing: '-0.025em' },
  subtitle1: { fontWeight: 600, letterSpacing: '-0.02em' },
  subtitle2: { fontWeight: 600, letterSpacing: '-0.015em' },
  body1: { letterSpacing: '-0.011em' },
  body2: { letterSpacing: '-0.011em' },
  button: { fontWeight: 600, letterSpacing: '-0.01em' },
  caption: { letterSpacing: '-0.006em' },
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
    secondary: { main: premiumTokens.orange },
    success: { main: premiumTokens.green },
    warning: { main: premiumTokens.orange },
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
      selected: alpha(premiumTokens.primary, 0.16),
      hover: alpha('#FFFFFF', 0.05),
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
      main: premiumTokens.primary,
      light: premiumTokens.primaryLight,
      dark: premiumTokens.primaryDark,
      contrastText: '#FFFFFF',
    },
    secondary: { main: premiumTokens.orange },
    success: { main: '#248A3D' },
    warning: { main: '#C93400' },
    error: { main: '#D70015' },
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
    action: {
      selected: alpha(premiumTokens.primary, 0.1),
      hover: alpha('#000000', 0.04),
    },
  },
  components: buildComponentOverrides('light'),
})
