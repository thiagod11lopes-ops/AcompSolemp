import { Box } from '@mui/material'
import { type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ClinicaTopBar, getClinicaTopbarHeight } from './ClinicaTopBar'

export function ClinicaLayout({ children }: { children?: ReactNode }) {
  const location = useLocation()
  const topbarHeight = getClinicaTopbarHeight(location.pathname)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ClinicaTopBar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          pt: `${topbarHeight}px`,
        }}
      >
        <Box sx={{ p: { xs: 2, md: 3 } }}>{children ?? <Outlet />}</Box>
      </Box>
    </Box>
  )
}
