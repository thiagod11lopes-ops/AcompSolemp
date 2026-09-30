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
import EmailIcon from '@mui/icons-material/Email'
import { NavLink } from 'react-router-dom'
import { BrandLogo } from '@/components/common/BrandLogo'
import { ChatDock } from '@/components/chat/ChatDock'
import { useAuth, useGestorAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useSupabaseDataSource } from '@/config/dataSource'
import { isSuperAdminEmail } from '@/utils/email'
import { loadAppData } from '@/mocks/seed'
import type { ReactNode } from 'react'

const DRAWER_WIDTH = 260

const menuItems: { path: string; label: string; icon: ReactNode; superAdminOnly?: boolean }[] = [
  { path: '/gestor/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/gestor/timeline', label: 'Timeline', icon: <TimelineIcon /> },
  { path: '/gestor/cadastros', label: 'Cadastro', icon: <PeopleIcon /> },
  { path: '/gestor/prazos', label: 'Prazos', icon: <ScheduleIcon /> },
  { path: '/gestor/balanco', label: 'Balanço', icon: <AccountBalanceWalletIcon /> },
  { path: '/gestor/relatorios', label: 'Relatório', icon: <AssessmentIcon /> },
  { path: '/gestor/arquivados', label: 'Arquivados', icon: <ArchiveIcon /> },
  {
    path: '/gestor/emails-cadastrados',
    label: 'Emails Cadastrados',
    icon: <EmailIcon />,
    superAdminOnly: true,
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user } = useGestorAuth()
  const { impersonationTargetEmail } = useAuth()
  const isSupabase = useSupabaseDataSource()
  const { mapPath, demoBannerHeight } = usePortalPaths()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const sessionEmail =
    user?.email?.trim().toLowerCase() ||
    loadAppData().tenantMeta?.ownerEmail?.trim().toLowerCase() ||
    ''
  const showSuperAdminItems =
    isSupabase && isSuperAdminEmail(sessionEmail) && !impersonationTargetEmail
  const visibleMenuItems = menuItems.filter(
    (item) => !item.superAdminOnly || showSuperAdminItems,
  )
  const drawerPaperSx = {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    height: demoBannerHeight > 0 ? `calc(100% - ${demoBannerHeight}px)` : '100%',
    ...(demoBannerHeight > 0 && {
      top: demoBannerHeight,
    }),
  }

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2.25, minHeight: 72, flexShrink: 0 }}>
        <BrandLogo />
      </Toolbar>
      <Divider />
      {user && (
        <Box sx={{ px: 2.25, py: 1.75, flexShrink: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: '-0.015em' }}>
            Usuário logado: {user.posto ? `${user.posto} ${user.nome}` : user.nome}
          </Typography>
        </Box>
      )}
      <Divider />
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <List sx={{ px: 0.5, py: 1, flexShrink: 0 }}>
          {visibleMenuItems.map((item) => (
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
        <ChatDock />
      </Box>
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
