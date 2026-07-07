import { Box } from '@mui/material'
import { type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { ClinicaTopBar, CLINICA_TOPBAR_HEIGHT } from './ClinicaTopBar'

export function ClinicaLayout({ children }: { children?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ClinicaTopBar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          pt: `${CLINICA_TOPBAR_HEIGHT}px`,
        }}
      >
        <Box sx={{ p: { xs: 2, md: 3 } }}>{children ?? <Outlet />}</Box>
      </Box>
    </Box>
  )
}
