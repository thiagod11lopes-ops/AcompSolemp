import {
  Box,
  Card,
  CardContent,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined'
import MedicationOutlinedIcon from '@mui/icons-material/MedicationOutlined'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ReactNode } from 'react'
import type { IndenizadoMensalOrigem } from '@/utils/totalIndenizado'
import { formatCurrency } from '@/utils/format'
import {
  dashboardCardIconOffsetSx,
  dashboardCardShellSx,
  dashboardCardTitleSx,
} from '@/components/dashboard/dashboardCardStyles'
import { premiumTokens } from '@/theme/tokens'

function ValorOrigemCard({
  title,
  value,
  description,
  accent,
  icon,
}: {
  title: string
  value: number
  description: string
  accent: string
  icon: ReactNode
}) {
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
              ...dashboardCardIconOffsetSx,
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: premiumTokens.primaryDark,
            wordBreak: 'break-word',
          }}
        >
          {formatCurrency(value)}
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto' }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  )
}

export function OpmeValorCard({ value }: { value: number }) {
  return (
    <ValorOrigemCard
      title="OPME"
      value={value}
      description="Valores totais provenientes das clínicas"
      accent={premiumTokens.primary}
      icon={<LocalHospitalOutlinedIcon />}
    />
  )
}

export function PmeValorCard({ value }: { value: number }) {
  return (
    <ValorOrigemCard
      title="PME"
      value={value}
      description="Valores totais provenientes do Medicamento"
      accent={premiumTokens.orange}
      icon={<MedicationOutlinedIcon />}
    />
  )
}

export function IndenizadoMensalComparativoCard({
  serie,
}: {
  serie: IndenizadoMensalOrigem[]
}) {
  const theme = useTheme()
  const opmeColor = premiumTokens.primaryDark
  const pmeColor = premiumTokens.orange

  return (
    <Card sx={dashboardCardShellSx}>
      <CardContent
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          minHeight: 280,
        }}
      >
        <Typography sx={dashboardCardTitleSx}>
          Indenizado mensal — OPME × PME
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Valor total indenizado no mês: clínicas (OPME) e medicamento (PME)
        </Typography>

        <Box sx={{ flex: 1, minHeight: 220, width: '100%' }}>
          {serie.length === 0 ? (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Sem valores indenizados para comparar.
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.6)} />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v)
                  }
                  width={48}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: 10,
                    border: `1px solid ${alpha(premiumTokens.primary, 0.25)}`,
                    boxShadow: '0 8px 24px rgba(63, 107, 86, 0.16)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="opme" name="OPME (clínicas)" fill={opmeColor} radius={[4, 4, 0, 0]} />
                <Bar dataKey="pme" name="PME (medicamento)" fill={pmeColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
