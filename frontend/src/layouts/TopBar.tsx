import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import ScienceIcon from '@mui/icons-material/Science'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import LogoutIcon from '@mui/icons-material/Logout'
import GroupsIcon from '@mui/icons-material/Groups'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth, useGestorAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useThemeMode } from '@/contexts/ThemeContext'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { GlobalProcessSearch } from '@/components/common/GlobalProcessSearch'
import { DemoCadastrosModal } from '@/components/gestor/DemoCadastrosModal'
import { SuperAdminGestoresDialog } from '@/components/gestor/SuperAdminGestoresDialog'
import { ImpersonationBanner } from '@/components/gestor/ImpersonationBanner'
import { DRAWER_WIDTH } from './Sidebar'
import { TIPOS_NOTIFICACAO_REVERSAO } from '@/utils/notificacoes'
import { isSuperAdminEmail } from '@/utils/email'
import { useSupabaseDataSource } from '@/config/dataSource'
import { loadAppData } from '@/mocks/seed'
import {
  isFictionalDashboardSeedActive,
  toggleFictionalDashboardSeed,
} from '@/services/fictionalDashboardSeedService'

interface TopBarProps {
  onMenuClick: () => void
  title?: string
}

export function TopBar({ onMenuClick, title = 'Portal do Gestor — SOLEMP' }: TopBarProps) {
  const { user, logout } = useGestorAuth()
  const { impersonationTargetEmail } = useAuth()
  const { mode, toggleTheme } = useThemeMode()
  const { demoBannerHeight } = usePortalPaths()
  const isSupabase = useSupabaseDataSource()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [demoOpen, setDemoOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [fictionalActive, setFictionalActive] = useState(() => isFictionalDashboardSeedActive())
  const [fictionalBusy, setFictionalBusy] = useState(false)

  const sessionEmail =
    user?.email?.trim().toLowerCase() ||
    loadAppData().tenantMeta?.ownerEmail?.trim().toLowerCase() ||
    ''
  const showSuperAdmin =
    isSupabase && isSuperAdminEmail(sessionEmail) && !impersonationTargetEmail

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleToggleFictional = () => {
    if (fictionalBusy) return
    setFictionalBusy(true)
    void (async () => {
      try {
        const wasActive = isFictionalDashboardSeedActive()
        const active = await toggleFictionalDashboardSeed()
        setFictionalActive(active)
        if (wasActive && !active) {
          queryClient.setQueriesData({ queryKey: ['demo-pedidos'] }, [])
          queryClient.removeQueries({ queryKey: ['demo-pedido'] })
        }
        await queryClient.invalidateQueries()
      } finally {
        setFictionalBusy(false)
      }
    })()
  }

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { md: `${DRAWER_WIDTH}px` },
        top: demoBannerHeight,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <ImpersonationBanner />
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ flexGrow: 1, fontWeight: 600, display: { xs: 'none', sm: 'block' } }}
        >
          {title}
        </Typography>
        <Box sx={{ flexGrow: { xs: 1, sm: 0 }, mr: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <GlobalProcessSearch portal="gestor" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Demonstração da Timeline">
            <IconButton onClick={() => setDemoOpen(true)} color="inherit">
              <ScienceIcon />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={
              fictionalActive
                ? 'Remover dados fictícios, limpar aba Demonstração e voltar aos dados reais'
                : 'Preencher o sistema com dados fictícios (dashboard)'
            }
          >
            <IconButton
              onClick={handleToggleFictional}
              color={fictionalActive ? 'warning' : 'inherit'}
              disabled={fictionalBusy}
              aria-pressed={fictionalActive}
            >
              <AutoFixHighIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Alternar tema">
            <IconButton onClick={toggleTheme} color="inherit">
              {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
          </Tooltip>
          <NotificationPanel excludeTipos={TIPOS_NOTIFICACAO_REVERSAO} />
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
              {user?.nome.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>
              <Typography variant="body2">
                {user?.posto} {user?.nome}
              </Typography>
            </MenuItem>
            {showSuperAdmin && (
              <MenuItem
                onClick={() => {
                  setAnchorEl(null)
                  setAdminOpen(true)
                }}
              >
                <GroupsIcon fontSize="small" sx={{ mr: 1 }} />
                Gestores ativos
              </MenuItem>
            )}
            <MenuItem onClick={() => void handleLogout()}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Sair
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
      <DemoCadastrosModal open={demoOpen} onClose={() => setDemoOpen(false)} />
      {showSuperAdmin && (
        <SuperAdminGestoresDialog open={adminOpen} onClose={() => setAdminOpen(false)} />
      )}
    </AppBar>
  )
}
