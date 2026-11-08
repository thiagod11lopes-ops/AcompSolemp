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
  Tooltip,
  Badge,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import ArchiveIcon from '@mui/icons-material/Archive'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PaymentsIcon from '@mui/icons-material/Payments'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import TimelineIcon from '@mui/icons-material/Timeline'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import { NavLink, useLocation } from 'react-router-dom'
import { BrandLogo } from '@/components/common/BrandLogo'
import { ChatDock } from '@/components/chat/ChatDock'
import { TimelineAbaSino } from '@/components/notifications/TimelineAbaSino'
import { useFinanceiroAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import {
  etapaChaveDaAbaSetor,
  useContagemPendenciasSetores,
} from '@/hooks/useContagemPendenciasSetores'
import {
  setorNavItemsParaUsuario,
  userPodeVerAbaBalanco,
  userTemMultiSetorNav,
} from '@/utils/setorNav'
import type { UserRole } from '@/types'
import { SidebarRailToggle } from '@/layouts/SidebarRailToggle'
import {
  SIDEBAR_EXPANDED_WIDTH_SETOR,
  useSidebarRail,
} from '@/layouts/sidebarRail'

const DRAWER_WIDTH = SIDEBAR_EXPANDED_WIDTH_SETOR

const ICON_POR_PERFIL: Partial<Record<UserRole | string, React.ReactNode>> = {
  AUDITORIA: <FactCheckIcon />,
  CONTABILIDADE_IMH: <AccountBalanceIcon />,
  CONFECCAO_SOLEMP: <TimelineIcon />,
  FINANCEIRO: <PaymentsIcon />,
  DIV_MAT_EMPENHADO: <HourglassTopIcon />,
}

const menuBalanco = {
  path: '/financeiro/balanco',
  label: 'Balanço',
  icon: <AccountBalanceWalletIcon />,
}

const menuBase = [
  { path: '/financeiro/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  {
    path: '/financeiro/pagamentos',
    label: 'Pagamentos pendentes',
    icon: <PaymentsIcon />,
    perfil: 'FINANCEIRO' as UserRole,
  },
  {
    path: '/financeiro/aguardando-empenho',
    label: 'Aguardando Empenho',
    icon: <HourglassTopIcon />,
  },
  { path: '/financeiro/arquivados', label: 'Arquivados', icon: <ArchiveIcon /> },
]

interface FinanceiroSidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

function isAbaTimeline(item: {
  path: string
  perfil?: UserRole
  etapa?: string
}): boolean {
  if (item.etapa || item.perfil) return true
  return (
    item.path.includes('/ordenador/timelines') ||
    item.path.includes('/financeiro/pagamentos')
  )
}

export function FinanceiroSidebar({ mobileOpen, onClose }: FinanceiroSidebarProps) {
  const { user } = useFinanceiroAuth()
  const { mapPath, demoBannerHeight } = usePortalPaths()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { collapsed, toggle, width } = useSidebarRail(DRAWER_WIDTH)
  const railCollapsed = collapsed && !isMobile
  const multiSetor = Boolean(user && userTemMultiSetorNav(user))
  const mostraBalanco = Boolean(user && userPodeVerAbaBalanco(user))
  const { contagemParaItem } = useContagemPendenciasSetores(user)

  const menuItems = (() => {
    if (!user || !multiSetor) {
      if (!mostraBalanco) return menuBase
      return [
        menuBase[0],
        menuBase[1],
        menuBase[2],
        menuBalanco,
        menuBase[3],
      ]
    }
    const setores = setorNavItemsParaUsuario(user).map((item) => ({
      ...item,
      label: item.perfil === 'CONTABILIDADE_IMH' ? 'Timelines' : item.label,
      icon:
        (item.etapa === 'DIV_MAT_EMPENHADO'
          ? ICON_POR_PERFIL.DIV_MAT_EMPENHADO
          : item.perfil
            ? ICON_POR_PERFIL[item.perfil]
            : undefined) ?? <TimelineIcon />,
    }))
    return [
      { path: '/financeiro/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
      ...setores,
      ...(mostraBalanco ? [menuBalanco] : []),
      { path: '/ordenador/arquivados', label: 'Arquivados', icon: <ArchiveIcon /> },
    ]
  })()

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar
        sx={{
          px: railCollapsed ? 0.75 : 2.25,
          py: railCollapsed ? 1.25 : 0,
          minHeight: railCollapsed ? 96 : 72,
          flexShrink: 0,
          display: 'flex',
          flexDirection: railCollapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: railCollapsed ? 'center' : 'space-between',
          gap: 1,
        }}
      >
        <BrandLogo iconOnly={railCollapsed} />
        {!isMobile ? <SidebarRailToggle collapsed={collapsed} onToggle={toggle} /> : null}
      </Toolbar>
      <Divider />
      {user && !railCollapsed ? (
        <Box sx={{ px: 2.25, py: 1.75, flexShrink: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: '-0.015em' }}>
            Usuário logado: {user.posto ? `${user.posto} ${user.nome}` : user.nome}
          </Typography>
        </Box>
      ) : null}
      {user && !railCollapsed ? <Divider /> : null}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <List sx={{ px: railCollapsed ? 0.75 : 0, flexShrink: 0 }}>
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
            const perfilItem = 'perfil' in item ? item.perfil : undefined
            const abaTimeline = isAbaTimeline({
              path: item.path,
              perfil: perfilItem,
              etapa,
            })
            const pendencias = abaTimeline
              ? contagemParaItem({ etapa, perfil: perfilItem })
              : 0
            const etapaChave = etapaChaveDaAbaSetor({ etapa, perfil: perfilItem }) ?? undefined

            const button = (
              <ListItemButton
                component={NavLink}
                to={to}
                end={!etapa}
                onClick={isMobile ? onClose : undefined}
                selected={Boolean(isActive)}
                sx={{
                  justifyContent: railCollapsed ? 'center' : 'flex-start',
                  px: railCollapsed ? 1 : 2,
                  minHeight: 44,
                  '&.active, &.Mui-selected': {
                    bgcolor: 'action.selected',
                    borderRight: 3,
                    borderColor: 'success.main',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: railCollapsed ? 0 : 40,
                    justifyContent: 'center',
                  }}
                >
                  {railCollapsed && abaTimeline && pendencias > 0 ? (
                    <Badge badgeContent={pendencias} color="warning" max={99}>
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                {!railCollapsed ? (
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          width: '100%',
                          pr: 0.5,
                        }}
                      >
                        <Typography component="span" variant="body1" sx={{ fontSize: 'inherit' }}>
                          {item.label}
                        </Typography>
                        {abaTimeline ? (
                          <TimelineAbaSino
                            pendencias={pendencias}
                            etapaChave={etapaChave}
                            perfil={perfilItem}
                            iconColor="warning"
                          />
                        ) : null}
                      </Box>
                    }
                  />
                ) : null}
              </ListItemButton>
            )

            const key = `${item.path}-${etapa ?? 'default'}-${item.label}`
            return railCollapsed ? (
              <Tooltip key={key} title={item.label} placement="right">
                <Box>{button}</Box>
              </Tooltip>
            ) : (
              <Box key={key}>{button}</Box>
            )
          })}
        </List>
        {!railCollapsed ? <ChatDock /> : null}
      </Box>
    </Box>
  )

  return (
    <Box
      component="nav"
      sx={{
        width: { md: width },
        flexShrink: { md: 0 },
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflowX: 'hidden',
          },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            pt: `${demoBannerHeight}px`,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  )
}

export { DRAWER_WIDTH as FINANCEIRO_DRAWER_WIDTH }
