import { Box, Toolbar } from '@mui/material'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { FinanceiroSidebar, FINANCEIRO_DRAWER_WIDTH } from './FinanceiroSidebar'
import { FinanceiroTopBar } from './FinanceiroTopBar'

export function FinanceiroLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <FinanceiroTopBar onMenuClick={() => setMobileOpen(true)} />
      <FinanceiroSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${FINANCEIRO_DRAWER_WIDTH}px)` },
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
