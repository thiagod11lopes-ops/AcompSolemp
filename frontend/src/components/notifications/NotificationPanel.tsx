import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
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
import { getHomeRouteForPerfil } from '@/utils/perfilEtapa'
import type { Notification } from '@/types'

function getNotificationPath(n: Notification): string | null {
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

export function NotificationPanel() {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { gestorUser, clinicaUser, ordenadorUser, financeiroUser } = useAuth()
  const user = gestorUser ?? ordenadorUser ?? financeiroUser ?? clinicaUser
  const { data: notifications = [] } = useNotifications(user?.perfil ?? null)
  const markRead = useMarkNotificationRead()
  const queryClient = useQueryClient()

  const unread = notifications.filter((n) => !n.lida).length

  const handleMarkAll = async () => {
    await notificationService.markAllAsRead(user?.perfil ?? null)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <>
      <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Badge badgeContent={unread} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 420 } } }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 700 }}>Notificações</Typography>
          {unread > 0 && (
            <Button size="small" onClick={handleMarkAll}>
              Marcar todas
            </Button>
          )}
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <MenuItem disabled>Nenhuma notificação</MenuItem>
        ) : (
          notifications.slice(0, 8).map((n) => (
            <MenuItem
              key={n.id}
              onClick={() => {
                if (!n.lida) markRead.mutate(n.id)
                const path = getNotificationPath(n)
                if (path) {
                  navigate(path)
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
