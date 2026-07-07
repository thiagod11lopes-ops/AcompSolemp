import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { usePortalPaths } from '@/contexts/DemoRouteContext'

export function DemoGestorLayout() {
  const { demoBannerHeight } = usePortalPaths()

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        pt: `${demoBannerHeight}px`,
      }}
    >
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Outlet />
      </Box>
    </Box>
  )
}
