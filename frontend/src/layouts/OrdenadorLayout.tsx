import { Box, Toolbar } from '@mui/material'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { OrdenadorSidebar, ORDENADOR_DRAWER_WIDTH } from './OrdenadorSidebar'
import { OrdenadorTopBar } from './OrdenadorTopBar'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useSidebarRail } from '@/layouts/sidebarRail'

export function OrdenadorLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { demoBannerHeight } = usePortalPaths()
  const { width } = useSidebarRail(ORDENADOR_DRAWER_WIDTH)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <OrdenadorTopBar onMenuClick={() => setMobileOpen(true)} />
      <OrdenadorSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
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
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
