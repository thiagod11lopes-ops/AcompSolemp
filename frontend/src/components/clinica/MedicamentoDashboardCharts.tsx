import type { ReactNode } from 'react'
import { Box, Card, CardContent, Grid, Typography, useTheme } from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/utils/format'
import { formatBalancoQtd, type MedicamentoPmeChartData } from '@/utils/medicamentoBalanco'
import { premiumTokens } from '@/theme/tokens'

function ChartCard({
  title,
  subtitle,
  height = 300,
  children,
}: {
  title: string
  subtitle: string
  height?: number
  children: ReactNode
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          {subtitle}
        </Typography>
        <Box sx={{ height, width: '100%' }}>{children}</Box>
      </CardContent>
    </Card>
  )
}

interface MedicamentoDashboardChartsProps {
  charts: MedicamentoPmeChartData
  periodoLabel: string
}

export function MedicamentoDashboardCharts({
  charts,
  periodoLabel,
}: MedicamentoDashboardChartsProps) {
  const theme = useTheme()
  const tick = theme.palette.text.secondary
  const grid = theme.palette.divider
  const hasTop = charts.topMedicamentos.length > 0

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.25 }}>
        Gráficos da PME
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartCard
            title="Consumo no período"
            subtitle={`Valor das linhas da IMH PME · ${periodoLabel}`}
            height={320}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis dataKey="ponto" tick={{ fill: tick, fontSize: 11 }} />
                <YAxis
                  tick={{ fill: tick, fontSize: 11 }}
                  tickFormatter={(value) =>
                    Number(value) >= 1000 ? `${Math.round(Number(value) / 1000)}k` : String(value)
                  }
                />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="consumo"
                  name="Valor consumido"
                  stroke={premiumTokens.primary}
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="indenizar"
                  name="A indenizar"
                  stroke={premiumTokens.purple}
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartCard title="Alertas atuais" subtitle="Estoque e validade da lista PME" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.alertas}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis dataKey="nome" tick={{ fill: tick, fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: tick, fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="valor" name="Itens" fill={premiumTokens.orange} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <ChartCard
            title="Itens mais consumidos"
            subtitle={`Maior valor na IMH PME · ${periodoLabel}`}
            height={Math.max(260, charts.topMedicamentos.length * 36)}
          >
            {hasTop ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topMedicamentos} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis type="number" tick={{ fill: tick, fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={150}
                    tick={{ fill: tick, fontSize: 11 }}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="valor" name="Valor" fill={premiumTokens.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ pt: 4 }}>
                Nenhum lançamento da IMH PME neste período.
              </Typography>
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <ChartCard
            title="Movimento de estoque"
            subtitle={`Entradas e saídas · ${periodoLabel}`}
            height={260}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.fluxoEstoque}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis dataKey="nome" tick={{ fill: tick, fontSize: 12 }} />
                <YAxis tick={{ fill: tick, fontSize: 11 }} />
                <Tooltip formatter={(value) => formatBalancoQtd(Number(value))} />
                <Bar dataKey="valor" name="Quantidade" fill={premiumTokens.green} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  )
}
