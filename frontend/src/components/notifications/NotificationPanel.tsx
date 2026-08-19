import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  Tooltip,
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useCadastros'
import { useMarkNotificationRead } from '@/hooks/usePedidos'
import { formatRelative } from '@/utils/format'
import { notificationService } from '@/services/cadastroService'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { getHomeRouteForPerfil } from '@/utils/perfilEtapa'
import { notificacaoPertenceAosTipos } from '@/utils/notificacoes'
import type { Notification, NotificationType } from '@/types'

function getNotificationPath(n: Notification): string | null {
  if (n.tipo === 'PLANILHA_DEVOLVIDA' && n.pedidoId) {
    if (n.perfilDestino === 'CLINICA' || n.perfilDestino === 'MEDICAMENTO' || n.perfilDestino === 'EMPENHADO') {
      return `/clinica/timeline/${n.pedidoId}`
    }
    return `/ordenador/timelines/${n.pedidoId}`
  }
  if (n.tipo === 'REVERSAO_TIMELINE') return '/gestor/reversoes'
  if (n.tipo === 'RESPOSTA_GESTOR' && n.pedidoId) return `/clinica/timeline/${n.pedidoId}`
  if (n.tipo === 'ETAPA_PENDENTE' || n.tipo === 'PAGAMENTO_PENDENTE') {
    if (n.perfilDestino === 'FINANCEIRO') {
      return n.pedidoId
        ? `/financeiro/pagamentos/${n.pedidoId}`
        : '/financeiro/pagamentos'
    }
    if (n.perfilDestino && n.perfilDestino !== 'CLINICA') {
      return n.pedidoId
        ? `/ordenador/timelines/${n.pedidoId}`
        : '/ordenador/timelines'
    }
  }
  if (n.pedidoId && n.perfilDestino) {
    return getHomeRouteForPerfil(n.perfilDestino)
  }
  return null
}

interface NotificationPanelProps {
  tipos?: NotificationType[]
  excludeTipos?: NotificationType[]
  title?: string
  emptyText?: string
  tooltip?: string
  size?: 'small' | 'medium'
  /** Cor do ícone (ex.: warning no menu lateral). */
  iconColor?: 'inherit' | 'warning' | 'primary'
  /** Evita que o clique no sino dispare o NavLink da aba. */
  stopClickPropagation?: boolean
}

export function NotificationPanel({
  tipos,
  excludeTipos,
  title = 'Notificações',
  emptyText = 'Nenhuma notificação',
  tooltip = 'Notificações',
  size = 'medium',
  iconColor = 'inherit',
  stopClickPropagation = false,
}: NotificationPanelProps) {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { gestorUser, clinicaUser, ordenadorUser, financeiroUser, demoMode } = useAuth()
  const { isDemo, mapPath } = usePortalPaths()
  const user =
    isDemo && demoMode
      ? demoMode.authUser
      : gestorUser ?? ordenadorUser ?? financeiroUser ?? clinicaUser
  const { data: notifications = [] } = useNotifications(user?.perfil ?? null)
  const markRead = useMarkNotificationRead()
  const queryClient = useQueryClient()

  const filtered = notifications.filter((n) =>
    notificacaoPertenceAosTipos(n, tipos, excludeTipos),
  )
  /** Sinos filtrados por tipo (ex.: Reversões) exibem só não lidas — ciência remove do sino. */
  const visible = tipos && tipos.length > 0 ? filtered.filter((n) => !n.lida) : filtered
  const unread = visible.filter((n) => !n.lida).length

  const handleMarkAll = async () => {
    await notificationService.markAllAsRead(user?.perfil ?? null, { tipos, excludeTipos })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton
          color={iconColor}
          size={size}
          onClick={(e) => {
            if (stopClickPropagation) {
              e.preventDefault()
              e.stopPropagation()
            }
            setAnchorEl(e.currentTarget)
          }}
          aria-label={tooltip}
        >
          <Badge badgeContent={unread} color="error">
            <NotificationsIcon fontSize={size === 'small' ? 'small' : 'medium'} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 420 } } }}
        onClick={stopClickPropagation ? (e) => e.stopPropagation() : undefined}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
          {unread > 0 && (
            <Button size="small" onClick={handleMarkAll}>
              Marcar todas
            </Button>
          )}
        </Box>
        <Divider />
        {visible.length === 0 ? (
          <MenuItem disabled>{emptyText}</MenuItem>
        ) : (
          visible.slice(0, 8).map((n) => (
            <MenuItem
              key={n.id}
              onClick={() => {
                if (!n.lida) markRead.mutate(n.id)
                const path = getNotificationPath(n)
                if (path) {
                  navigate(mapPath(path))
                  setAnchorEl(null)
                }
              }}
              sx={{ opacity: n.lida ? 0.6 : 1, whiteSpace: 'normal' }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: n.lida ? 400 : 700 }}>
                  {n.titulo}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {n.mensagem}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                  {formatRelative(n.data)}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  )
}
