import { Box, Toolbar } from '@mui/material'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { OrdenadorSidebar, ORDENADOR_DRAWER_WIDTH } from './OrdenadorSidebar'
import { OrdenadorTopBar } from './OrdenadorTopBar'

export function OrdenadorLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <OrdenadorTopBar onMenuClick={() => setMobileOpen(true)} />
      <OrdenadorSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${ORDENADOR_DRAWER_WIDTH}px)` },
          bgcolor: 'background.default',
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
