import { Box } from '@mui/material'
import { type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { ChatDock } from '@/components/chat/ChatDock'
import { ClinicaTopBar, CLINICA_TOPBAR_HEIGHT } from './ClinicaTopBar'
import { usePortalPaths } from '@/contexts/DemoRouteContext'

const CLINICA_CHAT_DOCK_WIDTH = 300

export function ClinicaLayout({ children }: { children?: ReactNode }) {
  const { demoBannerHeight } = usePortalPaths()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ClinicaTopBar />
      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          pt: `${CLINICA_TOPBAR_HEIGHT + demoBannerHeight}px`,
          bgcolor: 'background.default',
          minHeight: 0,
        }}
      >
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          <Box sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 }, pt: { xs: 1, md: 1.25 } }}>
            {children ?? <Outlet />}
          </Box>
        </Box>
        <Box
          sx={{
            width: { xs: '100%', md: CLINICA_CHAT_DOCK_WIDTH },
            flexShrink: 0,
            borderLeft: 1,
            borderColor: 'divider',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            position: 'sticky',
            top: CLINICA_TOPBAR_HEIGHT + demoBannerHeight,
            height: `calc(100vh - ${CLINICA_TOPBAR_HEIGHT + demoBannerHeight}px)`,
            bgcolor: 'background.paper',
          }}
        >
          <ChatDock fillHeight />
        </Box>
      </Box>
    </Box>
  )
}
