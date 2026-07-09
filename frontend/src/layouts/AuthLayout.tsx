import { Box, Paper } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { premiumTokens } from '@/theme/tokens'

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: premiumTokens.gradientAuth,
        backgroundAttachment: 'fixed',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: 4,
          borderRadius: `${premiumTokens.radius}px`,
          border: `1px solid ${premiumTokens.border}`,
          boxShadow: premiumTokens.shadow,
          backdropFilter: 'blur(16px)',
          background: premiumTokens.glass,
        }}
      >
        <Outlet />
      </Paper>
    </Box>
  )
}
