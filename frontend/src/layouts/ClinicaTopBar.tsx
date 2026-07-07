import {
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from '@mui/material'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import LogoutIcon from '@mui/icons-material/Logout'
import ListAltIcon from '@mui/icons-material/ListAlt'
import AddIcon from '@mui/icons-material/Add'
import TimelineIcon from '@mui/icons-material/Timeline'
import { useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { useClinicas } from '@/hooks/useCadastros'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'

const NAV_ITEMS = [
  { path: '/clinica/pedidos', label: 'Meus Pedidos', icon: <ListAltIcon sx={{ fontSize: 18 }} /> },
  { path: '/clinica/pedidos/novo', label: 'Novo Lançamento', icon: <AddIcon sx={{ fontSize: 18 }} /> },
  { path: '/clinica/timelines', label: 'Timeline', icon: <TimelineIcon sx={{ fontSize: 18 }} /> },
] as const

function resolveActiveTab(pathname: string): string {
  if (pathname.startsWith('/clinica/pedidos/novo')) return '/clinica/pedidos/novo'
  if (pathname.startsWith('/clinica/timeline')) return '/clinica/timelines'
  if (pathname.startsWith('/clinica/pedidos')) return '/clinica/pedidos'
  return '/clinica/pedidos'
}

export const CLINICA_TOPBAR_HEIGHT = 112

export function ClinicaTopBar() {
  const { user, logout } = useClinicaAuth()
  const { data: clinicas = [] } = useClinicas()
  const navigate = useNavigate()
  const location = useLocation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const clinica = clinicas.find((c) => c.id === user?.clinicaId)
  const activeTab = useMemo(() => resolveActiveTab(location.pathname), [location.pathname])

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
        left: 0,
        right: 0,
        zIndex: (t) => t.zIndex.appBar,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar variant="dense" sx={{ gap: 1, minHeight: 48 }}>
        <LocalHospitalIcon color="primary" />
        <Box sx={{ minWidth: 0, mr: 1 }}>
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
            Portal da Clínica
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {clinica?.nome ?? 'Materiais Consignados'}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <NotificationPanel />
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 0.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: 14 }}>
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
      </Toolbar>

      <Tabs
        value={activeTab}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 44,
          px: { xs: 0.5, sm: 2 },
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: (t) => t.palette.action.hover,
          '& .MuiTab-root': {
            minHeight: 44,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            gap: 0.75,
          },
        }}
      >
        {NAV_ITEMS.map((item) => (
          <Tab
            key={item.path}
            value={item.path}
            label={item.label}
            icon={item.icon}
            iconPosition="start"
            component={NavLink}
            to={item.path}
            end={item.path === '/clinica/pedidos' || item.path === '/clinica/timelines'}
          />
        ))}
      </Tabs>
    </Box>
  )
}
