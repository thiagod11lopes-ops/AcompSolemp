import {
  Badge,
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
import PaymentsIcon from '@mui/icons-material/Payments'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import TimelineIcon from '@mui/icons-material/Timeline'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import { NavLink, useLocation } from 'react-router-dom'
import { BrandLogo } from '@/components/common/BrandLogo'
import { ChatDock } from '@/components/chat/ChatDock'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { useFinanceiroAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useContagemPendenciasSetores } from '@/hooks/useContagemPendenciasSetores'
import { TIPOS_NOTIFICACAO_TIMELINE_SETOR } from '@/utils/notificacoes'
import {
  setorNavItemsParaUsuario,
  userPodeVerAbaBalanco,
  userTemMultiSetorNav,
} from '@/utils/setorNav'
import { userHasPerfil } from '@/utils/userPerfis'
import type { UserRole } from '@/types'

const DRAWER_WIDTH = 240

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
  { path: '/financeiro/pagamentos', label: 'Pagamentos pendentes', icon: <PaymentsIcon /> },
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

export function FinanceiroSidebar({ mobileOpen, onClose }: FinanceiroSidebarProps) {
  const { user } = useFinanceiroAuth()
  const { mapPath, demoBannerHeight } = usePortalPaths()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const multiSetor = Boolean(user && userTemMultiSetorNav(user))
  const mostraBalanco = Boolean(user && userPodeVerAbaBalanco(user))
  const isImh = Boolean(user && userHasPerfil(user, 'CONTABILIDADE_IMH'))
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
        <List sx={{ flexShrink: 0 }}>
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
            const isAbaSetor = Boolean(etapa || perfilItem)
            const pendencias =
              multiSetor && isAbaSetor
                ? contagemParaItem({ etapa, perfil: perfilItem })
                : 0
            const showSinoImh =
              isImh &&
              (perfilItem === 'CONTABILIDADE_IMH' ||
                etapa === 'DIV_MAT_CONTABILIDADE_IMH')

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
                    borderColor: 'success.main',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
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
                      {showSinoImh ? (
                        <Box
                          sx={{ display: 'flex', alignItems: 'center' }}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                          }}
                        >
                          <NotificationPanel
                            tipos={TIPOS_NOTIFICACAO_TIMELINE_SETOR}
                            title="Notificações — Timelines"
                            emptyText="Nenhuma notificação de timeline"
                            tooltip="Notificações de Timelines"
                            size="small"
                            iconColor="warning"
                            stopClickPropagation
                          />
                        </Box>
                      ) : multiSetor && isAbaSetor ? (
                        <Badge
                          badgeContent={pendencias}
                          color="error"
                          max={99}
                          showZero
                          sx={{
                            '& .MuiBadge-badge': {
                              fontSize: '0.65rem',
                              minWidth: 18,
                              height: 18,
                            },
                          }}
                        >
                          <NotificationsNoneIcon
                            fontSize="small"
                            sx={{ color: pendencias > 0 ? 'success.main' : 'text.secondary' }}
                          />
                        </Badge>
                      ) : null}
                    </Box>
                  }
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
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
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
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            pt: `${demoBannerHeight}px`,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
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
