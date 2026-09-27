import { Box, Toolbar } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { ClinicaSidebar, CLINICA_DRAWER_WIDTH } from './ClinicaSidebar'
import { ClinicaTopBar } from './ClinicaTopBar'
import { usePortalPaths } from '@/contexts/DemoRouteContext'

export function ClinicaLayout({ children }: { children?: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { demoBannerHeight } = usePortalPaths()

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <ClinicaTopBar onMenuClick={() => setMobileOpen(true)} />
      <ClinicaSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${CLINICA_DRAWER_WIDTH}px)` },
          bgcolor: 'background.default',
          pt: `${demoBannerHeight}px`,
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {children ?? <Outlet />}
        </Box>
      </Box>
    </Box>
  )
}
