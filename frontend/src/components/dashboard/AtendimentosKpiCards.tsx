import { Box, Card, CardContent, Typography, alpha } from '@mui/material'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined'
import type { ReactNode } from 'react'
import {
  dashboardCardShellSx,
  dashboardCardTitleSx,
} from '@/components/dashboard/dashboardCardStyles'
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
    <Card sx={dashboardCardShellSx}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography sx={dashboardCardTitleSx}>{title}</Typography>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: `${premiumTokens.radiusSm}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(accent, 0.14),
              color: accent,
              border: `1px solid ${alpha(accent, 0.28)}`,
              boxShadow: '0 2px 8px rgba(63, 107, 86, 0.12)',
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: premiumTokens.primaryDark,
          }}
        >
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
      title="Pessoas Atendidas"
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
