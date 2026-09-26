import { Box, Card, CardContent, Typography, alpha } from '@mui/material'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined'
import type { ReactNode } from 'react'
import { premiumTokens } from '@/theme/tokens'

interface ContagemKpiCardProps {
  title: string
  value: number
  description: string
  accent: string
  icon: ReactNode
}

function ContagemKpiCard({ title, value, description, accent, icon }: ContagemKpiCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        border: `1px solid ${alpha(accent, 0.22)}`,
        boxShadow: premiumTokens.shadowSm,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: premiumTokens.shadow,
        },
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: '0.02em' }}
          >
            {title}
          </Typography>
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
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: accent }}>
          {value}
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto' }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  )
}

export function PessoasAtendidasCard({ value }: { value: number }) {
  return (
    <ContagemKpiCard
      title="Pessoas atendidas"
      value={value}
      description="NIPs únicos por planilha IMH (mesmo NIP em outra planilha conta de novo)"
      accent={premiumTokens.primary}
      icon={<GroupsOutlinedIcon />}
    />
  )
}

export function ProcedimentosCard({ value }: { value: number }) {
  return (
    <ContagemKpiCard
      title="Procedimentos"
      value={value}
      description="Todas as linhas das planilhas Div. Material"
      accent={premiumTokens.green}
      icon={<MedicalServicesOutlinedIcon />}
    />
  )
}
