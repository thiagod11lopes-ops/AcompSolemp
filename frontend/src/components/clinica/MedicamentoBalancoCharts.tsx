import { useMemo, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Box,
  Card,
  CardContent,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/utils/format'
import {
  buildMedicamentoBalancoChartBundles,
  formatBalancoQtd,
  type MedicamentoBalancoResult,
} from '@/utils/medicamentoBalanco'
import { premiumTokens } from '@/theme/tokens'

const ANIM_MS = 1400

const chartCardSx = {
  height: '100%',
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  background: `linear-gradient(165deg, ${alpha('#fff', 0.98)} 0%, ${alpha(premiumTokens.primary, 0.04)} 100%)`,
  boxShadow: '0 10px 36px rgba(15, 23, 42, 0.06)',
  overflow: 'hidden',
} as const

function formatKpi(value: number, format: 'qtd' | 'moeda' | 'int'): string {
  if (format === 'moeda') return formatCurrency(value)
  if (format === 'qtd') return formatBalancoQtd(value)
  return String(Math.round(value))
}

function ChartShell({
  title,
  subtitle,
  height = 300,
  delay = 0,
  children,
}: {
  title: string
  subtitle?: string
  height?: number
  delay?: number
  children: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ height: '100%' }}
    >
      <Card elevation={0} sx={chartCardSx}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              {subtitle}
            </Typography>
          ) : (
            <Box sx={{ mb: 1 }} />
          )}
          <Box sx={{ flex: 1, minHeight: height }}>{children}</Box>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface MedicamentoBalancoChartsProps {
  balanco: MedicamentoBalancoResult
  animationKey: string
}

export function MedicamentoBalancoCharts({ balanco, animationKey }: MedicamentoBalancoChartsProps) {
  const theme = useTheme()
  const grid = alpha(theme.palette.text.primary, 0.08)
  const tick = theme.palette.text.secondary
  const series = useMemo(() => buildMedicamentoBalancoChartBundles(balanco), [balanco])

  const tooltipStyle = {
    borderRadius: 12,
    border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
    boxShadow: '0 12px 28px rgba(15,23,42,0.12)',
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animationKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: {
              xs: '1fr 1fr',
              sm: 'repeat(4, 1fr)',
            },
            mb: 2,
          }}
        >
          {series.kpis.map((kpi, index) => (
            <motion.div
              key={kpi.key}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.45, ease: 'easeOut' }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <Card elevation={0} sx={{ ...chartCardSx, minHeight: 88 }}>
                <CardContent sx={{ py: 1.35, px: 1.5, '&:last-child': { pb: 1.35 } }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700, display: 'block' }}
                  >
                    {kpi.label}
                  </Typography>
                  <motion.div
                    key={`${animationKey}-${kpi.key}-${kpi.value}`}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        mt: 0.35,
                        lineHeight: 1.15,
                        background: `linear-gradient(90deg, ${premiumTokens.primaryDark}, ${premiumTokens.purple})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {formatKpi(kpi.value, kpi.format)}
                    </Typography>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 1.75,
            gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' },
            mb: 1.75,
          }}
        >
          <ChartShell
            title="Tendência do período"
            subtitle="Consumo, indenização e fluxo de estoque"
            height={320}
            delay={0.05}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series.areaTendencia}>
                <defs>
                  <linearGradient id="balancoConsumo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={premiumTokens.primary} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={premiumTokens.primary} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="balancoIndenizar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={premiumTokens.purple} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={premiumTokens.purple} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" stroke={grid} />
                <XAxis dataKey="ponto" tick={{ fill: tick, fontSize: 12 }} />
                <YAxis tick={{ fill: tick, fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => {
                    const n = Number(value)
                    const label = String(name)
                    if (label === 'Entradas' || label === 'Saídas') {
                      return [formatBalancoQtd(n), label]
                    }
                    return [formatCurrency(n), label]
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="consumo"
                  name="Consumo"
                  stroke={premiumTokens.primary}
                  fill="url(#balancoConsumo)"
                  strokeWidth={2.5}
                  isAnimationActive
                  animationBegin={80}
                  animationDuration={ANIM_MS}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="indenizar"
                  name="Indenizar"
                  stroke={premiumTokens.purple}
                  fill="url(#balancoIndenizar)"
                  strokeWidth={2.5}
                  isAnimationActive
                  animationBegin={220}
                  animationDuration={ANIM_MS}
                  animationEasing="ease-out"
                />
                <Line
                  type="monotone"
                  dataKey="entradas"
                  name="Entradas"
                  stroke={premiumTokens.green}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  isAnimationActive
                  animationBegin={360}
                  animationDuration={ANIM_MS}
                />
                <Line
                  type="monotone"
                  dataKey="saidas"
                  name="Saídas"
                  stroke={premiumTokens.orange}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 4 }}
                  isAnimationActive
                  animationBegin={480}
                  animationDuration={ANIM_MS}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartShell>

          <ChartShell
            title="Valores IMH"
            subtitle="Total consumido × a indenizar"
            height={320}
            delay={0.12}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series.valoresImh} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="4 8" stroke={grid} vertical={false} />
                <XAxis dataKey="nome" tick={{ fill: tick, fontSize: 12 }} />
                <YAxis tick={{ fill: tick, fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => formatCurrency(Number(v))}
                />
                <Bar
                  dataKey="valor"
                  name="Valor"
                  radius={[10, 10, 4, 4]}
                  isAnimationActive
                  animationDuration={ANIM_MS}
                  animationEasing="ease-out"
                >
                  {series.valoresImh.map((_, idx) => (
                    <Cell
                      key={`valor-${idx}`}
                      fill={idx === 0 ? premiumTokens.primary : premiumTokens.purple}
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke={premiumTokens.primaryDark}
                  strokeWidth={2}
                  dot={{ r: 5, fill: premiumTokens.yellow }}
                  isAnimationActive
                  animationBegin={400}
                  animationDuration={ANIM_MS}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartShell>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 1.75,
            gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr' },
            mb: 1.75,
          }}
        >
          <ChartShell
            title="Top medicamentos"
            subtitle="Maior valor no período (IMH)"
            height={300}
            delay={0.16}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  series.topMedicamentos.length > 0
                    ? series.topMedicamentos
                    : [{ nomeCurto: 'Sem dados', qtd: 0, valor: 0, nome: 'Sem dados' }]
                }
                layout="vertical"
                margin={{ left: 8, right: 12 }}
              >
                <CartesianGrid strokeDasharray="4 8" stroke={grid} horizontal={false} />
                <XAxis type="number" tick={{ fill: tick, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="nomeCurto"
                  width={110}
                  tick={{ fill: tick, fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) =>
                    String(name) === 'qtd'
                      ? [formatBalancoQtd(Number(v)), 'QTD']
                      : [formatCurrency(Number(v)), 'Valor']
                  }
                />
                <Bar
                  dataKey="valor"
                  name="valor"
                  radius={[0, 10, 10, 0]}
                  isAnimationActive
                  animationDuration={ANIM_MS}
                  animationEasing="ease-out"
                >
                  {(series.topMedicamentos.length > 0
                    ? series.topMedicamentos
                    : [{ nome: 'x' }]
                  ).map((_, idx) => (
                    <Cell
                      key={`top-${idx}`}
                      fill={
                        [
                          premiumTokens.primary,
                          premiumTokens.purple,
                          premiumTokens.green,
                          premiumTokens.orange,
                          premiumTokens.yellow,
                          premiumTokens.primaryLight,
                        ][idx % 6]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>

          <ChartShell
            title="Alertas de estoque"
            subtitle="Foto atual da lista"
            height={300}
            delay={0.2}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={series.alertas}
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={3}
                  isAnimationActive
                  animationBegin={120}
                  animationDuration={ANIM_MS}
                  animationEasing="ease-out"
                >
                  {series.alertas.map((item) => (
                    <Cell key={item.nome} fill={item.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </ChartShell>

          <ChartShell
            title="Pedidos no período"
            subtitle="% relativo ao total"
            height={300}
            delay={0.24}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="28%"
                outerRadius="90%"
                data={series.radialPedidos}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  dataKey="valor"
                  background={{ fill: alpha(theme.palette.text.primary, 0.06) }}
                  cornerRadius={10}
                  isAnimationActive
                  animationDuration={ANIM_MS}
                  animationEasing="ease-out"
                >
                  {series.radialPedidos.map((item) => (
                    <Cell key={item.nome} fill={item.fill} />
                  ))}
                </RadialBar>
                <Legend />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [`${Number(v)}%`, 'Participação']}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </ChartShell>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 1.75,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}
        >
          <ChartShell
            title="Movimentações de estoque"
            subtitle="Entradas, saídas e saldo"
            height={280}
            delay={0.28}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series.estoqueMov} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="4 8" stroke={grid} vertical={false} />
                <XAxis dataKey="nome" tick={{ fill: tick, fontSize: 12 }} />
                <YAxis tick={{ fill: tick, fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => formatBalancoQtd(Number(v))}
                />
                <Bar
                  dataKey="valor"
                  radius={[10, 10, 4, 4]}
                  isAnimationActive
                  animationDuration={ANIM_MS}
                  animationEasing="ease-out"
                >
                  {series.estoqueMov.map((item) => (
                    <Cell key={item.nome} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>

          <ChartShell
            title="Status dos pedidos"
            subtitle="Em andamento × concluídos"
            height={280}
            delay={0.32}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={
                    series.pedidos.every((p) => p.valor === 0)
                      ? [{ nome: 'Sem pedidos', valor: 1, fill: '#94A3B8' }]
                      : series.pedidos
                  }
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  isAnimationActive
                  animationBegin={200}
                  animationDuration={ANIM_MS}
                  animationEasing="ease-out"
                  label={({ name, percent }) =>
                    `${String(name).slice(0, 10)} ${Math.round((percent ?? 0) * 100)}%`
                  }
                >
                  {(series.pedidos.every((p) => p.valor === 0)
                    ? [{ nome: 'Sem pedidos', fill: '#94A3B8' }]
                    : series.pedidos
                  ).map((item) => (
                    <Cell key={item.nome} fill={item.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ChartShell>
        </Box>
      </motion.div>
    </AnimatePresence>
  )
}
