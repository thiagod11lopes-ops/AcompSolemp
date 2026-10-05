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
  fill = false,
  children,
}: {
  title: string
  subtitle?: string
  height?: number
  fill?: boolean
  children: ReactNode
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%', minHeight: 0 }}>
      <CardContent
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          ...(fill ? { py: 1, px: 1.25, '&:last-child': { pb: 1 } } : null),
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: fill ? '0.8rem' : undefined, lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" sx={{ mb: fill ? 0.25 : 1, display: 'block', lineHeight: 1.2 }}>
            {subtitle}
          </Typography>
        ) : null}
        <Box sx={{ height: fill ? undefined : height, flex: fill ? 1 : undefined, minHeight: fill ? 0 : undefined, width: '100%' }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  )
}

interface MedicamentoDashboardChartsProps {
  charts: MedicamentoPmeChartData
  periodoLabel: string
  /** Gráficos menores, preenchendo o espaço que sobra na tela. */
  compact?: boolean
}

export function MedicamentoDashboardCharts({
  charts,
  periodoLabel,
  compact = false,
}: MedicamentoDashboardChartsProps) {
  const theme = useTheme()
  const tick = theme.palette.text.secondary
  const grid = theme.palette.divider
  const hasTop = charts.topMedicamentos.length > 0
  const tickFont = compact ? 10 : 11
  const axis = { fill: tick, fontSize: tickFont }

  const consumo = (
    <ChartCard
      title="Consumo no período"
      subtitle={compact ? periodoLabel : `Valor das linhas da IMH PME · ${periodoLabel}`}
      height={320}
      fill={compact}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={charts.evolucao} margin={compact ? { top: 4, right: 8, left: 0, bottom: 0 } : undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="ponto" tick={axis} minTickGap={compact ? 28 : 8} />
          <YAxis
            width={compact ? 36 : 60}
            tick={axis}
            tickFormatter={(value) =>
              Number(value) >= 1000 ? `${Math.round(Number(value) / 1000)}k` : String(value)
            }
          />
          <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), String(name)]} />
          <Legend wrapperStyle={{ fontSize: tickFont, lineHeight: '16px' }} iconSize={compact ? 8 : 14} />
          <Line
            type="monotone"
            dataKey="consumo"
            name="Valor consumido"
            stroke={premiumTokens.primary}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="indenizar"
            name="A indenizar"
            stroke={premiumTokens.purple}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )

  const alertas = (
    <ChartCard title="Alertas atuais" subtitle={compact ? undefined : 'Estoque e validade da lista PME'} height={320} fill={compact}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={charts.alertas} margin={compact ? { top: 4, right: 4, left: 0, bottom: 0 } : undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="nome" tick={axis} interval={0} />
          <YAxis width={compact ? 28 : 60} allowDecimals={false} tick={axis} />
          <Tooltip />
          <Bar dataKey="valor" name="Itens" fill={premiumTokens.orange} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )

  const itens = (
    <ChartCard
      title="Itens mais consumidos"
      subtitle={compact ? undefined : `Maior valor na IMH PME · ${periodoLabel}`}
      height={Math.max(260, charts.topMedicamentos.length * 36)}
      fill={compact}
    >
      {hasTop ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={charts.topMedicamentos}
            layout="vertical"
            margin={{ left: 0, right: 12, top: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis type="number" tick={axis} />
            <YAxis type="category" dataKey="nome" width={compact ? 108 : 150} tick={axis} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Bar dataKey="valor" name="Valor" fill={premiumTokens.primary} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ pt: compact ? 1 : 4 }}>
          Nenhum lançamento da IMH PME neste período.
        </Typography>
      )}
    </ChartCard>
  )

  const estoque = (
    <ChartCard
      title="Movimento de estoque"
      subtitle={compact ? undefined : `Entradas e saídas · ${periodoLabel}`}
      height={260}
      fill={compact}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={charts.fluxoEstoque} margin={compact ? { top: 4, right: 4, left: 0, bottom: 0 } : undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="nome" tick={axis} />
          <YAxis width={compact ? 36 : 60} tick={axis} />
          <Tooltip formatter={(value) => formatBalancoQtd(Number(value))} />
          <Bar dataKey="valor" name="Quantidade" fill={premiumTokens.green} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )

  if (compact) {
    return (
      <Box
        sx={{
          flex: '1 1 auto',
          minHeight: { sm: 480 },
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', sm: '1.35fr 1fr' },
          gridTemplateRows: { xs: 'repeat(4, 240px)', sm: 'minmax(220px, 1fr) minmax(220px, 1fr)' },
        }}
      >
        {consumo}
        {alertas}
        {itens}
        {estoque}
      </Box>
    )
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.25 }}>
        Gráficos da PME
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>{consumo}</Grid>
        <Grid size={{ xs: 12, lg: 4 }}>{alertas}</Grid>
        <Grid size={{ xs: 12, lg: 7 }}>{itens}</Grid>
        <Grid size={{ xs: 12, lg: 5 }}>{estoque}</Grid>
      </Grid>
    </Box>
  )
}
