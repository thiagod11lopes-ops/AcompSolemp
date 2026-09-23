import { Box, Paper, ThemeProvider } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { lightTheme } from '@/theme/theme'
import { premiumTokens } from '@/theme/tokens'

/**
 * Tela de autenticação: fundo escuro atmosférico + cartão claro de alto contraste
 * (independente do tema claro/escuro do app), para labels e textos sempre legíveis.
 */
export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: `
          radial-gradient(ellipse 90% 70% at 10% -10%, rgba(59, 130, 246, 0.28), transparent 55%),
          radial-gradient(ellipse 70% 55% at 100% 100%, rgba(37, 99, 235, 0.2), transparent 50%),
          radial-gradient(ellipse 50% 40% at 70% 20%, rgba(14, 165, 233, 0.12), transparent 45%),
          #0B1220
        `,
        backgroundAttachment: 'fixed',
        p: { xs: 2, sm: 3 },
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
          pointerEvents: 'none',
        },
      }}
    >
      <ThemeProvider theme={lightTheme}>
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 440,
            p: { xs: 3, sm: 4 },
            borderRadius: 3.5,
            overflow: 'hidden',
            color: '#0F172A',
            bgcolor: '#FFFFFF',
            border: '1px solid rgba(255,255,255,0.65)',
            boxShadow:
              '0 4px 6px rgba(15, 23, 42, 0.04), 0 24px 48px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.06)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, ${premiumTokens.primaryDark}, ${premiumTokens.primaryLight}, #38BDF8)`,
            },
          }}
        >
          <Outlet />
        </Paper>
      </ThemeProvider>
    </Box>
  )
}
