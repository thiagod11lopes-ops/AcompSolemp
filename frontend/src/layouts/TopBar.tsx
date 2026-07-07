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
import LogoutIcon from '@mui/icons-material/Logout'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGestorAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useThemeMode } from '@/contexts/ThemeContext'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { DemoCadastrosModal } from '@/components/gestor/DemoCadastrosModal'
import { DRAWER_WIDTH } from './Sidebar'

interface TopBarProps {
  onMenuClick: () => void
  title?: string
}

export function TopBar({ onMenuClick, title = 'Portal do Gestor — SOLEMP' }: TopBarProps) {
  const { user, logout } = useGestorAuth()
  const { mode, toggleTheme } = useThemeMode()
  const { demoBannerHeight } = usePortalPaths()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [demoOpen, setDemoOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
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
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Demonstração da Timeline">
            <IconButton onClick={() => setDemoOpen(true)} color="inherit">
              <ScienceIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Alternar tema">
            <IconButton onClick={toggleTheme} color="inherit">
              {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
          </Tooltip>
          <NotificationPanel />
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
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Sair
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
      <DemoCadastrosModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </AppBar>
  )
}
