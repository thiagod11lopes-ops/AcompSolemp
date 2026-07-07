import { Box } from '@mui/material'
import { type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { ClinicaTopBar, CLINICA_TOPBAR_HEIGHT } from './ClinicaTopBar'
import { usePortalPaths } from '@/contexts/DemoRouteContext'

export function ClinicaLayout({ children }: { children?: ReactNode }) {
  const { demoBannerHeight } = usePortalPaths()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ClinicaTopBar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          pt: `${CLINICA_TOPBAR_HEIGHT + demoBannerHeight}px`,
        }}
      >
        <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 }, pt: { xs: 1, md: 1.25 } }}>
          {children ?? <Outlet />}
        </Box>
      </Box>
    </Box>
  )
}
