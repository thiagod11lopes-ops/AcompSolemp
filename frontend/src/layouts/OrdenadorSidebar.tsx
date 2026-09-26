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
import GavelIcon from '@mui/icons-material/Gavel'
import TimelineIcon from '@mui/icons-material/Timeline'
import PaymentsIcon from '@mui/icons-material/Payments'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import { NavLink, useLocation } from 'react-router-dom'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { loginPerfilLabel } from '@/utils/loginPerfis'
import {
  setorNavItemsParaUsuario,
  setorNavSubtitle,
  userTemMultiSetorNav,
} from '@/utils/setorNav'
import type { UserRole } from '@/types'

const DRAWER_WIDTH = 240

const ICON_POR_PERFIL: Partial<Record<UserRole | string, React.ReactNode>> = {
  AUDITORIA: <FactCheckIcon />,
  CONTABILIDADE_IMH: <AccountBalanceIcon />,
  CONFECCAO_SOLEMP: <TimelineIcon />,
  FINANCEIRO: <PaymentsIcon />,
  DIV_MAT_EMPENHADO: <HourglassTopIcon />,
}

const menuBase = [
  { path: '/ordenador/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/ordenador/timelines', label: 'Timelines pendentes', icon: <TimelineIcon /> },
  { path: '/ordenador/arquivados', label: 'Arquivados', icon: <ArchiveIcon /> },
]

interface OrdenadorSidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function OrdenadorSidebar({ mobileOpen, onClose }: OrdenadorSidebarProps) {
  const { user } = useOrdenadorAuth()
  const { mapPath, demoBannerHeight } = usePortalPaths()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const multiSetor = Boolean(user && userTemMultiSetorNav(user))

  const menuItems = (() => {
    if (!user || !multiSetor) return menuBase
    const setores = setorNavItemsParaUsuario(user).map((item) => ({
      ...item,
      icon:
        (item.etapa === 'DIV_MAT_EMPENHADO'
          ? ICON_POR_PERFIL.DIV_MAT_EMPENHADO
          : item.perfil
            ? ICON_POR_PERFIL[item.perfil]
            : undefined) ?? <TimelineIcon />,
    }))
    return [
      { path: '/ordenador/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
      ...setores,
      { path: '/ordenador/arquivados', label: 'Arquivados', icon: <ArchiveIcon /> },
    ]
  })()

  const titulo = multiSetor && user ? 'Meus setores' : 'Ordenador de Despesa'
  const subtitulo =
    multiSetor && user ? setorNavSubtitle(user) : 'Assinatura de SOLEMP'
  const perfilCaption =
    multiSetor && user ? setorNavSubtitle(user) : user ? loginPerfilLabel(user.perfil) : ''

  const drawer = (
    <Box>
      <Toolbar sx={{ px: 2, minHeight: `${56 + demoBannerHeight}px !important` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GavelIcon color="warning" />
          <Box>
            <Typography variant="subtitle1" color="warning.dark" sx={{ fontWeight: 700 }}>
              {titulo}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitulo}
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
            {perfilCaption}
          </Typography>
        </Box>
      )}
      <Divider />
      <List>
        {menuItems.map((item) => {
          const etapa = 'etapa' in item ? item.etapa : undefined
          const to = etapa
            ? { pathname: mapPath(item.path), search: `?etapa=${etapa}` }
            : mapPath(item.path)
          const etapaAtual = new URLSearchParams(location.search).get('etapa')
          const isTimelinesPath = location.pathname.includes('/ordenador/timelines')
          const isActive = etapa
            ? isTimelinesPath && etapaAtual === etapa
            : location.pathname.includes(item.path.replace(/^\//, '')) &&
              !(multiSetor && isTimelinesPath && etapaAtual)

          return (
            <ListItemButton
              key={`${item.path}-${etapa ?? 'default'}-${item.label}`}
              component={NavLink}
              to={to}
              end={!etapa}
              onClick={isMobile ? onClose : undefined}
              selected={Boolean(isActive)}
              sx={{
                '&.active, &.Mui-selected': {
                  bgcolor: 'action.selected',
                  borderRight: 3,
                  borderColor: 'warning.main',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          )
        })}
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
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            pt: `${demoBannerHeight}px`,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  )
}

export { DRAWER_WIDTH as ORDENADOR_DRAWER_WIDTH }
