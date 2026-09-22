import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  alpha,
} from '@mui/material'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import { premiumTokens } from '@/theme/tokens'

export interface EmAndamentoPorEtapaItem {
  etapa: string
  quantidade: number
  ordem: number
}

interface EmAndamentoCardProps {
  total: number
  porEtapa: EmAndamentoPorEtapaItem[]
  onClick?: () => void
}

export function EmAndamentoCard({ total, porEtapa, onClick }: EmAndamentoCardProps) {
  const accent = premiumTokens.yellow

  const content = (
    <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: '0.02em' }}
          >
            Em andamento
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mt: 0.5 }}>
            {total}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {total === 1 ? 'PED ativo na timeline' : 'PEDs ativos na timeline'}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: `${premiumTokens.radiusSm}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(accent, 0.12),
            color: accent,
            border: `1px solid ${alpha(accent, 0.2)}`,
            flexShrink: 0,
          }}
        >
          <PendingActionsIcon fontSize="small" />
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Nos cards da timeline
        </Typography>
        {porEtapa.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nenhum PED ativo no momento.
          </Typography>
        ) : (
          <Box
            component="ul"
            sx={{
              m: 0,
              p: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              maxHeight: { xs: 220, lg: 'none' },
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
            }}
          >
            {porEtapa.map((item) => (
              <Box
                component="li"
                key={`${item.ordem}-${item.etapa}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 1.5,
                  bgcolor: alpha(accent, 0.06),
                  border: `1px solid ${alpha(accent, 0.14)}`,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0 }}>
                  {item.etapa}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 800,
                    color: accent,
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {item.quantidade} PED{item.quantidade === 1 ? '' : 's'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {onClick && (
        <Typography variant="caption" color="text.secondary">
          Clique para ver a lista completa
        </Typography>
      )}
    </CardContent>
  )

  return (
    <Card
      sx={{
        height: '100%',
        border: `1px solid ${alpha(accent, 0.22)}`,
        boxShadow: premiumTokens.shadowSm,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': onClick
          ? {
              transform: 'translateY(-4px)',
              boxShadow: premiumTokens.shadow,
              borderColor: premiumTokens.borderStrong,
            }
          : undefined,
      }}
    >
      {onClick ? (
        <CardActionArea
          onClick={onClick}
          sx={{ height: '100%', alignItems: 'stretch' }}
          aria-label="Em andamento — ver detalhes dos PEDs por card da timeline"
        >
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  )
}
