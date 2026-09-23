import { Box, Toolbar, IconButton, Typography, Avatar, Menu, MenuItem } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useFinanceiroAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { GlobalProcessSearch } from '@/components/common/GlobalProcessSearch'
import { ImpersonationBanner } from '@/components/gestor/ImpersonationBanner'
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
  const { impersonationTargetEmail } = useAuth()
  const { navigatePortal, demoBannerHeight } = usePortalPaths()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleLogout = async () => {
    const wasImpersonating = Boolean(impersonationTargetEmail)
    await logout()
    if (wasImpersonating) {
      navigate('/login', { replace: true })
      return
    }
    if (window.opener) {
      window.close()
      return
    }
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
      <ImpersonationBanner />
      <Toolbar>
        <IconButton edge="start" onClick={onMenuClick} sx={{ mr: 2, display: { md: 'none' } }}>
          <MenuIcon />
        </IconButton>
        <Typography
          variant="h6"
          sx={{ flexGrow: 1, fontWeight: 600, display: { xs: 'none', sm: 'block' } }}
        >
          {title}
        </Typography>
        <Box sx={{ mr: 1.5, display: 'flex', justifyContent: 'flex-end', flexGrow: { xs: 1, sm: 0 } }}>
          <GlobalProcessSearch portal="financeiro" />
        </Box>
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
          <MenuItem onClick={() => void handleLogout()}>
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
            {isDemo ? 'Voltar ao gestor' : 'Sair'}
          </MenuItem>
        </Menu>
      </Toolbar>
    </Box>
  )
}
