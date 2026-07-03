import { Box, Paper } from '@mui/material'
import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #0B3D91 0%, #1A5BB5 50%, #F4F6FA 50%)'
            : 'linear-gradient(135deg, #0F1419 0%, #1A2332 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: 4,
          borderRadius: 3,
        }}
      >
        <Outlet />
      </Paper>
    </Box>
  )
}
