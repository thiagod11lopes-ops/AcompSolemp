import { Box, Toolbar, IconButton, Typography, Avatar, Menu, MenuItem } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import { useState } from 'react'
import { useFinanceiroAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { FINANCEIRO_DRAWER_WIDTH } from './FinanceiroSidebar'

interface FinanceiroTopBarProps {
  onMenuClick: () => void
  title?: string
}

export function FinanceiroTopBar({
  onMenuClick,
  title = 'Pagamentos pendentes',
}: FinanceiroTopBarProps) {
  const { user, logout, isDemo } = useFinanceiroAuth()
  const { navigatePortal, demoBannerHeight } = usePortalPaths()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleLogout = async () => {
    await logout()
    navigatePortal(isDemo ? '/gestor/dashboard' : '/clinica/timeline')
  }

  return (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: demoBannerHeight,
        left: { md: FINANCEIRO_DRAWER_WIDTH },
        right: 0,
        zIndex: (t) => t.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar>
        <IconButton edge="start" onClick={onMenuClick} sx={{ mr: 2, display: { md: 'none' } }}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {title}
        </Typography>
        <NotificationPanel />
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'success.main', fontSize: 14 }}>
            {user?.nome.charAt(0)}
          </Avatar>
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem disabled>
            <Typography variant="body2">{user?.nome}</Typography>
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
            {isDemo ? 'Voltar ao gestor' : 'Sair'}
          </MenuItem>
        </Menu>
      </Toolbar>
    </Box>
  )
}
