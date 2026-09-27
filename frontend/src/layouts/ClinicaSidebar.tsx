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
import ListAltIcon from '@mui/icons-material/ListAlt'
import AddIcon from '@mui/icons-material/Add'
import TimelineIcon from '@mui/icons-material/Timeline'
import MedicationIcon from '@mui/icons-material/Medication'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BrandLogo } from '@/components/common/BrandLogo'
import { ChatDock } from '@/components/chat/ChatDock'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useClinicas } from '@/hooks/useCadastros'
import { stripDemoRouteBase } from '@/utils/portalPaths'

const DRAWER_WIDTH = 260

const MENU_ITEMS = [
  { path: '/clinica/dashboard', label: 'Dashboard', icon: <DashboardIcon />, end: true },
  { path: '/clinica/pedidos', label: 'Meus Pedidos', icon: <ListAltIcon />, end: true },
  { path: '/clinica/pedidos/novo', label: 'Planilhas', icon: <AddIcon />, end: false },
  {
    path: '/clinica/precos-medicamentos',
    label: 'Preço de Medicamentos',
    icon: <MedicationIcon />,
    end: true,
    medicamentoOnly: true,
  },
  { path: '/clinica/timelines', label: 'Timeline', icon: <TimelineIcon />, end: true },
  {
    path: '/clinica/balanco',
    label: 'Balanço Geral',
    icon: <AccountBalanceIcon />,
    end: true,
    medicamentoOnly: true,
  },
] as const

function isMenuPathActive(pathname: string, itemPath: string): boolean {
  const path = stripDemoRouteBase(pathname)
  if (itemPath === '/clinica/dashboard') {
    return path === '/clinica/dashboard' || path.startsWith('/clinica/dashboard/')
  }
  if (itemPath === '/clinica/pedidos/novo') {
    return path.startsWith('/clinica/pedidos/novo')
  }
  if (itemPath === '/clinica/pedidos') {
    return (
      path === '/clinica/pedidos' ||
      (path.startsWith('/clinica/pedidos/') && !path.startsWith('/clinica/pedidos/novo'))
    )
  }
  if (itemPath === '/clinica/timelines') {
    return path.startsWith('/clinica/timeline')
  }
  return path === itemPath || path.startsWith(`${itemPath}/`)
}

interface ClinicaSidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function ClinicaSidebar({ mobileOpen, onClose }: ClinicaSidebarProps) {
  const { user } = useClinicaAuth()
  const { data: clinicas = [] } = useClinicas()
  const { mapPath, demoBannerHeight } = usePortalPaths()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const clinica = clinicas.find((c) => c.id === user?.clinicaId)
  const isMedicamento =
    user?.perfil === 'MEDICAMENTO' || clinica?.tipo === 'medicamento'

  const menuItems = useMemo(
    () =>
      MENU_ITEMS.filter((item) =>
        'medicamentoOnly' in item && item.medicamentoOnly ? isMedicamento : true,
      ),
    [isMedicamento],
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
        <BrandLogo subtitle="Portal da Clínica" />
      </Toolbar>
      <Divider />
      {user && (
        <Box sx={{ px: 2.25, py: 1.75, flexShrink: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: '-0.015em' }}>
            Usuário logado: {user.posto ? `${user.posto} ${user.nome}` : user.nome}
          </Typography>
          {clinica?.nome ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
              {clinica.nome}
              {isMedicamento ? ' · Medicamento' : ''}
            </Typography>
          ) : null}
        </Box>
      )}
      <Divider />
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <List sx={{ px: 0.5, py: 1, flexShrink: 0 }}>
          {menuItems.map((item) => {
            const selected = isMenuPathActive(location.pathname, item.path)
            return (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={mapPath(item.path)}
                end={item.end}
                onClick={isMobile ? onClose : undefined}
                selected={selected}
                sx={{
                  '&.active, &.Mui-selected': {
                    bgcolor: 'action.selected',
                    borderRight: 3,
                    borderColor: 'primary.main',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      sx: { fontWeight: 600, fontSize: '0.925rem', letterSpacing: '-0.015em' },
                    },
                  }}
                />
              </ListItemButton>
            )
          })}
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

export { DRAWER_WIDTH as CLINICA_DRAWER_WIDTH }
