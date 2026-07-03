import { Box, Toolbar, IconButton, Typography, Avatar, Menu, MenuItem } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { ORDENADOR_DRAWER_WIDTH } from './OrdenadorSidebar'

interface OrdenadorTopBarProps {
  onMenuClick: () => void
  title?: string
}

export function OrdenadorTopBar({ onMenuClick, title = 'Assinatura de SOLEMP' }: OrdenadorTopBarProps) {
  const { user, logout } = useOrdenadorAuth()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleLogout = async () => {
    await logout()
    navigate('/clinica/timeline')
  }

  return (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: 0,
        left: { md: ORDENADOR_DRAWER_WIDTH },
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
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'warning.main', fontSize: 14 }}>
            {user?.nome.charAt(0)}
          </Avatar>
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem disabled>
            <Typography variant="body2">{user?.nome}</Typography>
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
            Sair
          </MenuItem>
        </Menu>
      </Toolbar>
    </Box>
  )
}
