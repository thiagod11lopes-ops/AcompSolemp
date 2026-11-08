import { Box, Toolbar } from '@mui/material'
import { useState, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { ClinicaSidebar, CLINICA_DRAWER_WIDTH } from './ClinicaSidebar'
import { ClinicaTopBar } from './ClinicaTopBar'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useSidebarRail } from '@/layouts/sidebarRail'

export function ClinicaLayout({ children }: { children?: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { demoBannerHeight } = usePortalPaths()
  const { width } = useSidebarRail(CLINICA_DRAWER_WIDTH)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <ClinicaTopBar onMenuClick={() => setMobileOpen(true)} />
      <ClinicaSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${width}px)` },
          bgcolor: 'background.default',
          pt: `${demoBannerHeight}px`,
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
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
