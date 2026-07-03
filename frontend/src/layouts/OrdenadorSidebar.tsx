import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import GavelIcon from '@mui/icons-material/Gavel'
import TimelineIcon from '@mui/icons-material/Timeline'
import { NavLink } from 'react-router-dom'
import { useOrdenadorAuth } from '@/contexts/AuthContext'

const DRAWER_WIDTH = 240

const menuItems = [
  { path: '/ordenador/timelines', label: 'Timelines pendentes', icon: <TimelineIcon /> },
]

interface OrdenadorSidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function OrdenadorSidebar({ mobileOpen, onClose }: OrdenadorSidebarProps) {
  const { user } = useOrdenadorAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const drawer = (
    <Box>
      <Toolbar sx={{ px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GavelIcon color="warning" />
          <Box>
            <Typography variant="subtitle1" color="warning.dark" sx={{ fontWeight: 700 }}>
              Ordenador de Despesa
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Assinatura de SOLEMP
            </Typography>
          </Box>
        </Box>
      </Toolbar>
      <Divider />
      {user && (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {user.nome}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ordenador de Despesa
          </Typography>
        </Box>
      )}
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            end
            onClick={isMobile ? onClose : undefined}
            sx={{
              '&.active': {
                bgcolor: 'action.selected',
                borderRight: 3,
                borderColor: 'warning.main',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )

  return (
    <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  )
}

export { DRAWER_WIDTH as ORDENADOR_DRAWER_WIDTH }
