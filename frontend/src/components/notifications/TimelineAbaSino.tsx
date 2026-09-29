import { Badge, Box, Tooltip } from '@mui/material'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { TIPOS_NOTIFICACAO_TIMELINE_SETOR } from '@/utils/notificacoes'
import type { UserRole } from '@/types'

interface TimelineAbaSinoProps {
  /** Cards pendentes nesta aba. Sino só aparece quando > 0. */
  pendencias: number
  /** Filtra o painel de notificações pela etapa da aba (opcional). */
  etapaChave?: string
  perfil?: UserRole
  iconColor?: 'warning' | 'primary'
  /** Quando true, abre o painel de notificações; senão só exibe o badge. */
  comPainel?: boolean
}

/**
 * Sino na aba de timeline: aparece quando há card pendente,
 * com badge da contagem.
 */
export function TimelineAbaSino({
  pendencias,
  etapaChave,
  perfil,
  iconColor = 'warning',
  comPainel = true,
}: TimelineAbaSinoProps) {
  if (pendencias <= 0) return null

  const label =
    pendencias === 1
      ? '1 card pendente nesta timeline'
      : `${pendencias} cards pendentes nesta timeline`

  if (!comPainel) {
    return (
      <Tooltip title={label}>
        <Badge
          badgeContent={pendencias}
          color="error"
          max={99}
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
            sx={{ color: `${iconColor}.main` }}
            aria-label={label}
          />
        </Badge>
      </Tooltip>
    )
  }

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center' }}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      title={label}
    >
      <NotificationPanel
        tipos={TIPOS_NOTIFICACAO_TIMELINE_SETOR}
        etapaChave={etapaChave}
        perfilDestino={perfil}
        badgeContent={pendencias}
        title="Notificações — Timelines"
        emptyText="Nenhuma notificação de timeline"
        tooltip={label}
        size="small"
        iconColor={iconColor}
        stopClickPropagation
      />
    </Box>
  )
}
