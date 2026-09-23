import { useMemo, useState, type ReactNode, type MouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
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
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, startOfYear, subMonths, subYears } from 'date-fns'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useDashboardMetrics } from '@/hooks/usePedidos'
import { buildGestorBalanco } from '@/utils/gestorBalanco'
import { downloadGestorBalancoPdf } from '@/utils/gestorBalancoPdf'
import { formatCurrency } from '@/utils/format'
import { premiumTokens } from '@/theme/tokens'

type Preset = 'mes' | 'trimestre' | 'ano' | '12m' | 'custom'

function toDateInputValue(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function presetRange(preset: Preset): { inicio: string; fim: string } {
  const now = new Date()
  const fim = endOfDay(now)
  if (preset === 'mes') {
    return { inicio: toDateInputValue(startOfMonth(now)), fim: toDateInputValue(fim) }
  }
  if (preset === 'trimestre') {
    return { inicio: toDateInputValue(startOfDay(subMonths(now, 2))), fim: toDateInputValue(fim) }
  }
  if (preset === 'ano') {
    return { inicio: toDateInputValue(startOfYear(now)), fim: toDateInputValue(fim) }
  }
  // 12m default
  return { inicio: toDateInputValue(startOfDay(subYears(now, 1))), fim: toDateInputValue(fim) }
}

const CHART_COLORS = [
  premiumTokens.primary,
  premiumTokens.green,
  premiumTokens.yellow,
  premiumTokens.red,
  premiumTokens.purple,
  premiumTokens.orange,
  premiumTokens.primaryLight,
]

function ChartCard({
  title,
  subtitle,
  height = 320,
  children,
}: {
  title: string
  subtitle?: string
  height?: number
  children: ReactNode
}) {
  const theme = useTheme()
  return (
    <Card
      elevation={0}
      sx={{
        height,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
        background: `linear-gradient(165deg, ${alpha(premiumTokens.primary, 0.04)} 0%, ${theme.palette.background.paper} 42%)`,
        overflow: 'hidden',
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', pb: '16px !important' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
            {subtitle}
          </Typography>
        )}
        <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
      </CardContent>
    </Card>
  )
}

function KpiTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ height: '100%' }}
    >
      <Box
        sx={{
          height: '100%',
          p: 2,
          borderRadius: 3,
          border: `1px solid ${alpha(accent, 0.25)}`,
          background: `linear-gradient(145deg, ${alpha(accent, 0.12)} 0%, ${alpha('#fff', 0.9)} 55%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -20,
            top: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: alpha(accent, 0.15),
          }}
        />
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}
        >
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, letterSpacing: '-0.02em', color: accent }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
    </motion.div>
  )
}

export default function GestorBalancoPage() {
  const theme = useTheme()
  const { data: metrics, isLoading, isError } = useDashboardMetrics()
  const [preset, setPreset] = useState<Preset>('12m')
  const [dataInicio, setDataInicio] = useState(() => presetRange('12m').inicio)
  const [dataFim, setDataFim] = useState(() => presetRange('12m').fim)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [pdfErro, setPdfErro] = useState<string | null>(null)

  const balanco = useMemo(() => {
    if (!metrics) return null
    return buildGestorBalanco(metrics, { dataInicio, dataFim })
  }, [metrics, dataInicio, dataFim])

  const animationKey = `${dataInicio}-${dataFim}-${balanco?.kpis.totalProcessos ?? 0}`

  const radialData = useMemo(() => {
    if (!balanco) return []
    const total = Math.max(balanco.kpis.totalProcessos, 1)
    const taxa = Math.round((balanco.kpis.concluidos / total) * 100)
    return [{ name: 'Conclusão', value: taxa, fill: premiumTokens.green }]
  }, [balanco])

  const handlePreset = (_: MouseEvent<HTMLElement>, value: Preset | null) => {
    if (!value) return
    setPreset(value)
    if (value === 'custom') return
    const range = presetRange(value)
    setDataInicio(range.inicio)
    setDataFim(range.fim)
  }

  const handleGerarDocumento = async () => {
    if (!balanco) return
    setPdfErro(null)
    setGerandoPdf(true)
    try {
      await downloadGestorBalancoPdf(balanco)
    } catch (err) {
      console.error(err)
      setPdfErro(err instanceof Error ? err.message : 'Falha ao gerar o PDF.')
    } finally {
      setGerandoPdf(false)
    }
  }

  if (isLoading) return <LoadingSpinner />

  if (isError || !metrics || !balanco) {
    return (
      <Box>
        <PageHeader title="Balanço" subtitle="Visão consolidada do sistema" />
        <Alert severity="error">Não foi possível carregar os indicadores do balanço.</Alert>
      </Box>
    )
  }

  const { kpis } = balanco

  return (
    <Box>
      <PageHeader
        title="Balanço"
        subtitle="Balanço geral do sistema com indicadores, evolução e exportação em PDF"
        action={
          <Button
            variant="contained"
            startIcon={gerandoPdf ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
            onClick={handleGerarDocumento}
            disabled={gerandoPdf}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              px: 2.5,
              background: `linear-gradient(135deg, ${premiumTokens.primaryDark}, ${premiumTokens.primary})`,
            }}
          >
            {gerandoPdf ? 'Gerando…' : 'Gerar documento'}
          </Button>
        }
      />

      {pdfErro && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPdfErro(null)}>
          {pdfErro}
        </Alert>
      )}

      <Card
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(120deg, ${alpha(premiumTokens.primary, 0.06)}, transparent 50%)`,
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AccountBalanceWalletIcon sx={{ color: premiumTokens.primary }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Período do balanço
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {balanco.periodoLabel}
                </Typography>
              </Box>
            </Box>

            <ToggleButtonGroup
              exclusive
              size="small"
              value={preset === 'custom' ? null : preset}
              onChange={handlePreset}
              sx={{ flexWrap: 'wrap' }}
            >
              <ToggleButton value="mes">Mês</ToggleButton>
              <ToggleButton value="trimestre">Trimestre</ToggleButton>
              <ToggleButton value="ano">Ano</ToggleButton>
              <ToggleButton value="12m">12 meses</ToggleButton>
            </ToggleButtonGroup>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <TextField
                label="Início"
                type="date"
                size="small"
                value={dataInicio}
                onChange={(e) => {
                  setPreset('custom')
                  setDataInicio(e.target.value)
                }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ minWidth: 150 }}
              />
              <TextField
                label="Fim"
                type="date"
                size="small"
                value={dataFim}
                onChange={(e) => {
                  setPreset('custom')
                  setDataFim(e.target.value)
                }}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: {
                    min: dataInicio || undefined,
                    max: toDateInputValue(endOfMonth(new Date())),
                  },
                }}
                sx={{ minWidth: 150 }}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div
          key={animationKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiTile
                label="Processos"
                value={String(kpis.totalProcessos)}
                hint={`${kpis.emAndamento} em andamento`}
                accent={premiumTokens.primary}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiTile
                label="Concluídos"
                value={String(kpis.concluidos)}
                hint={
                  kpis.tempoMedioConclusaoDias != null
                    ? `média ${kpis.tempoMedioConclusaoDias} dias`
                    : undefined
                }
                accent={premiumTokens.green}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiTile
                label="Atrasados"
                value={String(kpis.atrasados)}
                hint={`${kpis.proximosVencimento} próximos`}
                accent={premiumTokens.red}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiTile
                label="Empenhado"
                value={formatCurrency(kpis.valorEmpenhado)}
                hint={`${kpis.quantidadeEmpenhado} empenhos`}
                accent={premiumTokens.primaryDark}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiTile
                label="Indenizado"
                value={formatCurrency(kpis.valorIndenizado)}
                hint={`a indenizar ${formatCurrency(kpis.valorASerIndenizado)}`}
                accent={premiumTokens.purple}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiTile
                label="Aguard. empenho"
                value={formatCurrency(kpis.valorAguardandoEmpenho)}
                hint={`${kpis.quantidadeAguardandoEmpenho} SOLEMP`}
                accent={premiumTokens.orange}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 2.5, flexWrap: 'wrap' }}>
            {balanco.statusDistribuicao.map((s) => (
              <Chip
                key={s.name}
                size="small"
                label={`${s.name}: ${s.value}`}
                sx={{
                  fontWeight: 600,
                  borderColor: s.color,
                  color: s.color,
                  bgcolor: alpha(s.color, 0.08),
                }}
                variant="outlined"
              />
            ))}
          </Stack>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <ChartCard
                title="Evolução mensal"
                subtitle="Processos abertos, concluídos e valor empenhado"
                height={380}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={balanco.serieMensal}>
                    <defs>
                      <linearGradient id="balancoAreaProc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={premiumTokens.primary} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={premiumTokens.primary} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.8)} />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        Number(v) >= 1_000_000
                          ? `${(Number(v) / 1_000_000).toFixed(1)}M`
                          : Number(v) >= 1000
                            ? `${(Number(v) / 1000).toFixed(0)}k`
                            : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        const n = Number(value)
                        if (String(name).toLowerCase().includes('empenhado')) return formatCurrency(n)
                        return n
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="processos"
                      name="Processos"
                      stroke={premiumTokens.primary}
                      fill="url(#balancoAreaProc)"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="concluidos"
                      name="Concluídos"
                      stroke={premiumTokens.green}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="valorEmpenhado"
                      name="Empenhado (R$)"
                      fill={alpha(premiumTokens.purple, 0.55)}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <ChartCard title="Taxa de conclusão" subtitle="% concluídos no período" height={380}>
                <Box sx={{ height: '70%', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="55%"
                      outerRadius="100%"
                      data={radialData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar background dataKey="value" cornerRadius={12} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      pointerEvents: 'none',
                    }}
                  >
                    <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
                      {radialData[0]?.value ?? 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      concluídos
                    </Typography>
                  </Box>
                </Box>
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {kpis.concluidos} de {kpis.totalProcessos} processos
                  </Typography>
                </Stack>
              </ChartCard>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <ChartCard title="Distribuição de status" height={340}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={balanco.statusDistribuicao}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={95}
                      paddingAngle={3}
                      label={({ name, percent }) =>
                        `${String(name).slice(0, 10)} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {balanco.statusDistribuicao.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <ChartCard title="Empenhos por mês" subtitle="Valor consolidado" height={340}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={balanco.empenhoPorMes}>
                    <defs>
                      <linearGradient id="balancoEmpenhoFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={premiumTokens.primaryLight} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={premiumTokens.primaryLight} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.8)} />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Area
                      type="monotone"
                      dataKey="valor"
                      name="Valor"
                      stroke={premiumTokens.primary}
                      fill="url(#balancoEmpenhoFill)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <ChartCard title="Ranking de clínicas" subtitle="Por valor dos processos no período" height={360}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={balanco.rankingClinicas} layout="vertical" margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={110}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => String(v).slice(0, 16)}
                    />
                    <Tooltip
                      formatter={(v, name) =>
                        String(name) === 'valor' ? formatCurrency(Number(v)) : Number(v)
                      }
                    />
                    <Bar dataKey="valor" name="valor" radius={[0, 8, 8, 0]} maxBarSize={18}>
                      {balanco.rankingClinicas.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <ChartCard title="Gargalos na timeline" subtitle="PEDs em andamento por etapa" height={360}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={balanco.gargalos} margin={{ bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="etapa"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-28}
                      textAnchor="end"
                      height={60}
                      tickFormatter={(v) => String(v).slice(0, 14)}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v, name) =>
                        String(name) === 'valor' ? formatCurrency(Number(v)) : Number(v)
                      }
                    />
                    <Legend />
                    <Bar dataKey="quantidade" name="Qtd." fill={premiumTokens.yellow} radius={[8, 8, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="valor" name="Valor" fill={alpha(premiumTokens.orange, 0.7)} radius={[8, 8, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <ChartCard title="Ranking de empresas" subtitle="Fornecedores por valor no período" height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={balanco.rankingEmpresas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="nome"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => String(v).slice(0, 18)}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(v, name) =>
                        String(name) === 'Valor' ? formatCurrency(Number(v)) : Number(v)
                      }
                    />
                    <Bar dataKey="valor" name="Valor" fill={premiumTokens.primary} radius={[8, 8, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="total" name="Processos" fill={alpha(premiumTokens.green, 0.65)} radius={[8, 8, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Grid>
          </Grid>
        </motion.div>
      </AnimatePresence>
    </Box>
  )
}
