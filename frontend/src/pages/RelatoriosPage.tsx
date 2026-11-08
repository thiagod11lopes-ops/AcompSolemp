import { useMemo, useState, type MouseEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import AssessmentIcon from '@mui/icons-material/Assessment'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { GerarDocumentoModal } from '@/components/clinica/GerarDocumentoModal'
import { useDashboardMetrics } from '@/hooks/usePedidos'
import { formatCurrency } from '@/utils/format'
import { buildRelatorioGerencial } from '@/utils/relatorioGerencial'
import { downloadRelatorioGerencial } from '@/utils/relatorioGerencialExport'
import {
  maxDataFimInput,
  presetRange,
  type PeriodoPreset,
} from '@/utils/periodoPresets'
import { premiumTokens } from '@/theme/tokens'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export default function RelatoriosPage() {
  const theme = useTheme()
  const { data: metrics, isLoading, isError, error, refetch } = useDashboardMetrics()
  const [gerarOpen, setGerarOpen] = useState(false)
  const [preset, setPreset] = useState<PeriodoPreset>('mes')
  const [dataInicio, setDataInicio] = useState(() => presetRange('mes').inicio)
  const [dataFim, setDataFim] = useState(() => presetRange('mes').fim)

  const relatorio = useMemo(() => {
    if (!metrics) return null
    return buildRelatorioGerencial(metrics, { dataInicio, dataFim })
  }, [metrics, dataInicio, dataFim])

  const handlePreset = (_: MouseEvent<HTMLElement>, value: PeriodoPreset | null) => {
    if (!value || value === 'custom') return
    setPreset(value)
    const range = presetRange(value)
    setDataInicio(range.inicio)
    setDataFim(range.fim)
  }

  if (isLoading) return <LoadingSpinner />
  if (isError) {
    return (
      <>
        <PageHeader
          title="Relatórios"
          subtitle="Pacote gerencial por período — PDF e Excel"
        />
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          }
        >
          {error instanceof Error ? error.message : 'Falha ao carregar os relatórios.'}
        </Alert>
      </>
    )
  }
  if (!metrics || !relatorio) return <LoadingSpinner />

  const { balanco, porOrigem, tempoPorEtapa, porClinica } = relatorio
  const { kpis } = balanco
  const gargalosChart = tempoPorEtapa.slice(0, 8).map((g) => ({
    etapa: g.etapa.length > 22 ? `${g.etapa.slice(0, 20)}…` : g.etapa,
    mediaDias: g.mediaDias,
    atrasados: g.atrasados,
  }))

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Indicadores por período com exportação PDF / Excel"
        action={
          <Button
            variant="contained"
            startIcon={<DescriptionOutlinedIcon />}
            onClick={() => setGerarOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              px: 2.5,
              background: `linear-gradient(135deg, ${premiumTokens.primaryDark}, ${premiumTokens.primary})`,
            }}
          >
            Exportar relatório
          </Button>
        }
      />

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
              <AssessmentIcon sx={{ color: premiumTokens.primary }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Período do relatório
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {relatorio.periodoLabel}
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
                    max: maxDataFimInput(),
                  },
                }}
                sx={{ minWidth: 150 }}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'Processos',
            value: String(kpis.totalProcessos),
            hint: `${kpis.emAndamento} em andamento`,
          },
          {
            label: 'Concluídos',
            value: String(kpis.concluidos),
            hint:
              kpis.tempoMedioConclusaoDias != null
                ? `média ${kpis.tempoMedioConclusaoDias} dias`
                : '—',
          },
          {
            label: 'Atrasados',
            value: String(kpis.atrasados),
            hint: `${kpis.proximosVencimento} próximos`,
          },
          {
            label: 'Empenhado (NE)',
            value: formatCurrency(kpis.valorEmpenhado),
            hint: `${kpis.quantidadeEmpenhado} empenho(s)`,
          },
          {
            label: 'Indenizado',
            value: formatCurrency(kpis.valorIndenizado),
            hint: `a indenizar ${formatCurrency(kpis.valorASerIndenizado)}`,
          },
          {
            label: 'Aguardando NE',
            value: formatCurrency(kpis.valorAguardandoEmpenho),
            hint: `${kpis.quantidadeAguardandoEmpenho} SOLEMP`,
          },
        ].map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Paper sx={{ p: 2, height: '100%', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {kpi.label}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {kpi.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {kpi.hint}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, height: '100%', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              OPME × PME
            </Typography>
            {porOrigem.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sem processos no período.
              </Typography>
            ) : (
              porOrigem.map((o) => (
                <Box key={o.origem} sx={{ py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {o.origem}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {o.total} processos · {o.concluidos} concluídos · {o.atrasados} atrasados
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Valor {formatCurrency(o.valor)} · Empenhado {formatCurrency(o.valorEmpenhado)}
                  </Typography>
                </Box>
              ))
            )}

            <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 1, fontWeight: 700 }}>
              Top clínicas
            </Typography>
            {porClinica.slice(0, 6).map((c) => (
              <Typography key={`${c.clinica}-${c.origem}`} variant="body2" sx={{ py: 0.4 }}>
                <strong>{c.clinica}</strong> ({c.origem}): {c.total} · {formatCurrency(c.valor)}
              </Typography>
            ))}
            {porClinica.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Sem clínicas no período.
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, height: 400, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Tempo médio por etapa
            </Typography>
            {gargalosChart.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sem dados de etapa no período.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={gargalosChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="etapa" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="mediaDias" name="Média dias" fill={premiumTokens.primary} />
                  <Bar dataKey="atrasados" name="Atrasados" fill={premiumTokens.red} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <GerarDocumentoModal
        open={gerarOpen}
        titulo="Exportar relatório gerencial"
        onClose={() => setGerarOpen(false)}
        onConfirm={async (formato) => {
          await downloadRelatorioGerencial(relatorio, formato)
        }}
      />
    </>
  )
}
