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
import DashboardIcon from '@mui/icons-material/Dashboard'
import AssignmentIcon from '@mui/icons-material/Assignment'
import PeopleIcon from '@mui/icons-material/People'
import HistoryIcon from '@mui/icons-material/History'
import AssessmentIcon from '@mui/icons-material/Assessment'
import UndoIcon from '@mui/icons-material/Undo'
import TimelineIcon from '@mui/icons-material/Timeline'
import { NavLink } from 'react-router-dom'
import { useGestorAuth } from '@/contexts/AuthContext'
import { getRoleLabel } from '@/mocks/seed'

const DRAWER_WIDTH = 260

const menuItems = [
  { path: '/gestor/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/gestor/processos', label: 'Processos', icon: <AssignmentIcon /> },
  { path: '/gestor/cadastros', label: 'Cadastros', icon: <PeopleIcon /> },
  { path: '/gestor/historico', label: 'Histórico', icon: <HistoryIcon /> },
  { path: '/gestor/relatorios', label: 'Relatórios', icon: <AssessmentIcon /> },
  { path: '/gestor/reversoes', label: 'Reversões', icon: <UndoIcon /> },
  { path: '/gestor/timeline', label: 'Timeline', icon: <TimelineIcon /> },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user } = useGestorAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const drawer = (
    <Box>
      <Toolbar sx={{ px: 2 }}>
        <Box>
          <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700 }}>
            AcompSOLEMP
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Portal do Gestor — Marinha do Brasil
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      {user && (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {user.posto} {user.nome}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getRoleLabel(user.perfil)}
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
            onClick={isMobile ? onClose : undefined}
            sx={{
              '&.active': {
                bgcolor: 'action.selected',
                borderRight: 3,
                borderColor: 'primary.main',
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

export { DRAWER_WIDTH }
