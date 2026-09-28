import { Box, Toolbar, IconButton, Typography, Avatar, Menu, MenuItem } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useOrdenadorAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { GlobalProcessSearch } from '@/components/common/GlobalProcessSearch'
import { TopBarTitle } from '@/components/common/TopBarTitle'
import { ImpersonationBanner } from '@/components/gestor/ImpersonationBanner'
import { TIPOS_NOTIFICACAO_TIMELINE_SETOR } from '@/utils/notificacoes'
import { userHasPerfil } from '@/utils/userPerfis'
import { ORDENADOR_DRAWER_WIDTH } from './OrdenadorSidebar'

interface OrdenadorTopBarProps {
  onMenuClick: () => void
}

export function OrdenadorTopBar({ onMenuClick }: OrdenadorTopBarProps) {
  const { user, logout, isDemo } = useOrdenadorAuth()
  const { impersonationTargetEmail } = useAuth()
  const { navigatePortal, demoBannerHeight } = usePortalPaths()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const isImh = Boolean(user && userHasPerfil(user, 'CONTABILIDADE_IMH'))

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
        left: { md: ORDENADOR_DRAWER_WIDTH },
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
        <TopBarTitle fallback="Assinatura de SOLEMP" />
        <Box sx={{ mr: 1.5, display: 'flex', justifyContent: 'flex-end', flexGrow: { xs: 1, sm: 0 } }}>
          <GlobalProcessSearch portal="ordenador" />
        </Box>
        <NotificationPanel
          excludeTipos={isImh ? TIPOS_NOTIFICACAO_TIMELINE_SETOR : undefined}
        />
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'warning.main', fontSize: 14 }}>
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
