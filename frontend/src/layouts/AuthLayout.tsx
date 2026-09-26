import { Box, Paper, ThemeProvider } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { lightTheme } from '@/theme/theme'
import { premiumTokens } from '@/theme/tokens'

/**
 * Autenticação no visual Raycast: fundo claro atmosférico + cartão branco leve.
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
          radial-gradient(ellipse 90% 60% at 15% -5%, rgba(255, 99, 99, 0.14), transparent 55%),
          radial-gradient(ellipse 70% 50% at 100% 100%, rgba(255, 159, 10, 0.08), transparent 50%),
          #F5F5F7
        `,
        backgroundAttachment: 'fixed',
        p: { xs: 2, sm: 3 },
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
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
            borderRadius: '18px',
            overflow: 'hidden',
            color: '#1D1D1F',
            bgcolor: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow:
              '0 1px 2px rgba(0,0,0,0.04), 0 24px 48px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: `linear-gradient(90deg, ${premiumTokens.primary}, ${premiumTokens.orange})`,
            },
          }}
        >
          <Outlet />
        </Paper>
      </ThemeProvider>
    </Box>
  )
}
