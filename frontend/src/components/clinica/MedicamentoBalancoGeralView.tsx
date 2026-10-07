import type { ReactNode } from 'react'
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import {
  Area,
  AreaChart,
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
  type MedicamentoPmeChartData,
} from '@/utils/medicamentoBalanco'
import { premiumTokens } from '@/theme/tokens'

function ChartPanel({
  title,
  subtitle,
  height = 300,
  children,
}: {
  title: string
  subtitle?: string
  height?: number
  children: ReactNode
}) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 3,
        border: (t) => `1px solid ${alpha(t.palette.divider, 0.9)}`,
        background: (t) =>
          `linear-gradient(165deg, ${alpha(t.palette.background.paper, 1)} 0%, ${alpha(
            premiumTokens.primary,
            0.04,
          )} 100%)`,
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ height, width: '100%', flex: 1, minHeight: height }}>{children}</Box>
      </CardContent>
    </Card>
  )
}

function MetricPill({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 2.5,
        minWidth: 140,
        flex: '1 1 140px',
        background: `linear-gradient(145deg, ${alpha(premiumTokens.primary, 0.12)} 0%, ${alpha(
          '#0f172a',
          0.03,
        )} 100%)`,
        border: `1px solid ${alpha(premiumTokens.primary, 0.18)}`,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: 'text.secondary',
          fontSize: '0.65rem',
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', mt: 0.25 }}>
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      ) : null}
    </Box>
  )
}

interface MedicamentoBalancoGeralViewProps {
  balanco: MedicamentoBalancoResult
  charts: MedicamentoPmeChartData
  clinicaNome: string
}

export function MedicamentoBalancoGeralView({
  balanco,
  charts,
  clinicaNome,
}: MedicamentoBalancoGeralViewProps) {
  const theme = useTheme()
  const tick = theme.palette.text.secondary
  const grid = theme.palette.divider
  const axis = { fill: tick, fontSize: 11 }
  const bundles = buildMedicamentoBalancoChartBundles(balanco)

  const formatKpi = (value: number, format: 'qtd' | 'moeda' | 'int') => {
    if (format === 'moeda') return formatCurrency(value)
    if (format === 'qtd') return formatBalancoQtd(value)
    return String(value)
  }

  const destaque = bundles.kpis.slice(0, 4)
  const secundarios = bundles.kpis.slice(4)

  const pedidoPie = bundles.pedidos.filter((p) => p.valor > 0)
  const alertaPie =
    bundles.alertas[0]?.nome === 'Sem alertas' ? [] : bundles.alertas.filter((a) => a.valor > 0)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box
        sx={{
          borderRadius: 3,
          p: { xs: 2, md: 2.5 },
          background: `linear-gradient(135deg, ${premiumTokens.primaryDark} 0%, ${premiumTokens.primary} 55%, ${premiumTokens.primaryLight} 100%)`,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -40,
            top: -40,
            width: 180,
            height: 180,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.1),
          }}
        />
        <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
          Balanço geral · PME
        </Typography>
        <Typography sx={{ opacity: 0.9, mt: 0.35, mb: 2, maxWidth: 560 }}>
          {clinicaNome} · {balanco.periodoLabel}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
          {destaque.map((kpi) => (
            <Box
              key={kpi.key}
              sx={{
                px: 1.75,
                py: 1.1,
                borderRadius: 2,
                bgcolor: alpha('#fff', 0.14),
                backdropFilter: 'blur(8px)',
                minWidth: 128,
                flex: '1 1 128px',
              }}
            >
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase' }}>
                {kpi.label}
              </Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                {formatKpi(kpi.value, kpi.format)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
        {secundarios.map((kpi) => (
          <MetricPill
            key={kpi.key}
            label={kpi.label}
            value={formatKpi(kpi.value, kpi.format)}
          />
        ))}
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartPanel
            title="Evolução no período"
            subtitle="Consumo, indenização e quantidade fornecida"
            height={340}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={charts.evolucao} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="medBalancoConsumo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={premiumTokens.primary} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={premiumTokens.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis dataKey="ponto" tick={axis} minTickGap={20} />
                <YAxis
                  yAxisId="valor"
                  width={56}
                  tick={axis}
                  tickFormatter={(v) =>
                    Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)
                  }
                />
                <YAxis
                  yAxisId="qtd"
                  orientation="right"
                  width={40}
                  tick={axis}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const n = Number(value)
                    if (String(name).toLowerCase().includes('qtd')) return [formatBalancoQtd(n), String(name)]
                    return [formatCurrency(n), String(name)]
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  yAxisId="valor"
                  type="monotone"
                  dataKey="consumo"
                  name="Valor consumido"
                  stroke={premiumTokens.primary}
                  fill="url(#medBalancoConsumo)"
                  strokeWidth={2.2}
                />
                <Line
                  yAxisId="valor"
                  type="monotone"
                  dataKey="indenizar"
                  name="A indenizar"
                  stroke={premiumTokens.orange}
                  strokeWidth={2}
                  dot={false}
                />
                <Bar
                  yAxisId="qtd"
                  dataKey="quantidade"
                  name="Qtd fornecida"
                  fill={alpha(premiumTokens.primaryDark, 0.45)}
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartPanel>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartPanel title="Pedidos no período" subtitle="Andamento × concluídos" height={340}>
            {pedidoPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pedidoPie}
                    dataKey="valor"
                    nameKey="nome"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {pedidoPie.map((entry) => (
                      <Cell key={entry.nome} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ pt: 8, textAlign: 'center' }}>
                Nenhum pedido no período.
              </Typography>
            )}
          </ChartPanel>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 5 }}>
          <ChartPanel
            title="Itens mais consumidos"
            subtitle="Maior valor na IMH PME"
            height={Math.max(280, charts.topMedicamentos.length * 34)}
          >
            {charts.topMedicamentos.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.topMedicamentos}
                  layout="vertical"
                  margin={{ left: 4, right: 16, top: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis type="number" tick={axis} />
                  <YAxis type="category" dataKey="nome" width={140} tick={axis} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="valor" name="Valor" radius={[0, 8, 8, 0]}>
                    {charts.topMedicamentos.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={idx % 2 === 0 ? premiumTokens.primary : premiumTokens.primaryLight}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ pt: 6 }}>
                Sem lançamentos IMH neste período.
              </Typography>
            )}
          </ChartPanel>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <ChartPanel title="Fluxo de estoque" subtitle="Entradas e saídas" height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.fluxoEstoque} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="medBalancoFluxo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={premiumTokens.green} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={premiumTokens.green} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis dataKey="nome" tick={axis} />
                <YAxis width={44} tick={axis} />
                <Tooltip formatter={(value) => formatBalancoQtd(Number(value))} />
                <Area
                  type="monotone"
                  dataKey="valor"
                  name="Quantidade"
                  stroke={premiumTokens.green}
                  fill="url(#medBalancoFluxo)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <ChartPanel title="Alertas de estoque" subtitle="Situação atual da lista PME" height={280}>
            {alertaPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alertaPie}
                    dataKey="valor"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {alertaPie.map((entry) => (
                      <Cell key={entry.nome} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ pt: 8, textAlign: 'center' }}>
                Sem alertas de estoque ou validade.
              </Typography>
            )}
          </ChartPanel>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <ChartPanel title="Conclusão dos pedidos" subtitle="% sobre o total do período" height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="28%"
                outerRadius="95%"
                data={bundles.radialPedidos}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background dataKey="valor" cornerRadius={8}>
                  {bundles.radialPedidos.map((entry) => (
                    <Cell key={entry.nome} fill={entry.fill} />
                  ))}
                </RadialBar>
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) => {
                    const item = bundles.radialPedidos.find((r) => r.nome === value)
                    return item ? `${value} (${item.valor}%)` : String(value)
                  }}
                />
                <Tooltip formatter={(value) => [`${value}%`, 'Participação']} />
              </RadialBarChart>
            </ResponsiveContainer>
          </ChartPanel>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartPanel
            title="Valor IMH × estoque"
            subtitle="Comparativo de totais do período"
            height={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  ...bundles.valoresImh.map((v) => ({ ...v, fill: premiumTokens.primary })),
                  ...bundles.estoqueMov.map((v) => ({ nome: v.nome, valor: v.valor, fill: v.fill })),
                ]}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <XAxis dataKey="nome" tick={axis} interval={0} />
                <YAxis
                  width={56}
                  tick={axis}
                  tickFormatter={(v) =>
                    Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(value, _name, item) => {
                    const label = String(item?.payload?.nome ?? '')
                    if (label.includes('Entradas') || label.includes('Saídas') || label === 'Saldo') {
                      return [formatBalancoQtd(Number(value)), label]
                    }
                    return [formatCurrency(Number(value)), label]
                  }}
                />
                <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                  {[
                    ...bundles.valoresImh.map((v) => ({ ...v, fill: premiumTokens.primary })),
                    ...bundles.estoqueMov,
                  ].map((entry, idx) => (
                    <Cell key={`${entry.nome}-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
        </Grid>
      </Grid>
    </Box>
  )
}
