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
import ArchiveIcon from '@mui/icons-material/Archive'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'
import AssessmentIcon from '@mui/icons-material/Assessment'
import TimelineIcon from '@mui/icons-material/Timeline'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import { NavLink } from 'react-router-dom'
import { useGestorAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { getRoleLabel } from '@/mocks/seed'

const DRAWER_WIDTH = 260

const menuItems = [
  { path: '/gestor/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/gestor/timeline', label: 'Timeline', icon: <TimelineIcon /> },
  { path: '/gestor/cadastros', label: 'Cadastro', icon: <PeopleIcon /> },
  { path: '/gestor/prazos', label: 'Prazos', icon: <ScheduleIcon /> },
  { path: '/gestor/balanco', label: 'Balanço', icon: <AccountBalanceWalletIcon /> },
  { path: '/gestor/relatorios', label: 'Relatório', icon: <AssessmentIcon /> },
  { path: '/gestor/arquivados', label: 'Arquivados', icon: <ArchiveIcon /> },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user } = useGestorAuth()
  const { mapPath, demoBannerHeight } = usePortalPaths()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const drawerPaperSx = {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box' as const,
    ...(demoBannerHeight > 0 && {
      top: demoBannerHeight,
      height: `calc(100% - ${demoBannerHeight}px)`,
    }),
  }

  const drawer = (
    <Box>
      <Toolbar sx={{ px: 2.25, minHeight: 64 }}>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, letterSpacing: '-0.03em', color: 'text.primary' }}
          >
            AcompSOLEMP
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '-0.01em' }}>
            Portal do Gestor
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      {user && (
        <Box sx={{ px: 2.25, py: 1.75 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: '-0.015em' }}>
            {user.posto} {user.nome}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getRoleLabel(user.perfil)}
          </Typography>
        </Box>
      )}
      <Divider />
      <List sx={{ px: 0.5, py: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={mapPath(item.path)}
            onClick={isMobile ? onClose : undefined}
          >
            <ListItemIcon sx={{ minWidth: 38, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              slotProps={{
                primary: {
                  sx: { fontWeight: 600, fontSize: '0.925rem', letterSpacing: '-0.015em' },
                },
              }}
            />
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
          '& .MuiDrawer-paper': drawerPaperSx,
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': drawerPaperSx,
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  )
}

export { DRAWER_WIDTH }
