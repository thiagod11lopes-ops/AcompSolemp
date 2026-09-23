import { useState } from 'react'
import { Alert, Button, Grid, Paper, Typography } from '@mui/material'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { GerarDocumentoModal } from '@/components/clinica/GerarDocumentoModal'
import { useDashboardMetrics } from '@/hooks/usePedidos'
import { formatCurrency } from '@/utils/format'
import { downloadGerarDocumento } from '@/utils/gerarDocumentoTabela'
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
  const { data: metrics, isLoading, isError, error, refetch } = useDashboardMetrics()
  const [gerarOpen, setGerarOpen] = useState(false)

  if (isLoading) return <LoadingSpinner />
  if (isError) {
    return (
      <>
        <PageHeader
          title="Relatórios"
          subtitle="Indicadores consolidados para análise gerencial"
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
  if (!metrics) return <LoadingSpinner />

  const relatorioResumo = [
    { indicador: 'Total de processos', valor: String(metrics.totalProcessos) },
    { indicador: 'Em andamento', valor: String(metrics.emAndamento) },
    { indicador: 'Concluídos', valor: String(metrics.concluidos) },
    { indicador: 'Atrasados', valor: String(metrics.atrasados) },
    { indicador: 'Tempo médio (dias)', valor: String(metrics.tempoMedioPagamento) },
    { indicador: 'Pago no mês', valor: formatCurrency(metrics.valorPagoMes) },
  ]

  const gargalos = metrics.rankingGargalos ?? []

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Indicadores consolidados para análise gerencial"
        action={
          <Button
            variant="outlined"
            startIcon={<DescriptionOutlinedIcon />}
            onClick={() => setGerarOpen(true)}
          >
            Gerar Documento
          </Button>
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resumo executivo
            </Typography>
            {relatorioResumo.map((item) => (
              <Typography key={item.indicador} variant="body2" sx={{ py: 0.5 }}>
                <strong>{item.indicador}:</strong> {item.valor}
              </Typography>
            ))}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Ranking de gargalos
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={gargalos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="etapa" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="mediaDias" name="Média dias" fill={premiumTokens.primary} />
                <Bar dataKey="atrasados" name="Atrasados" fill={premiumTokens.red} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <GerarDocumentoModal
        open={gerarOpen}
        onClose={() => setGerarOpen(false)}
        onConfirm={async (formato) => {
          const headers = ['Indicador', 'Valor']
          const rows: string[][] = [
            ...relatorioResumo.map((r) => [r.indicador, r.valor]),
            ['', ''],
            ['Ranking de gargalos', ''],
            ['Etapa', 'Média dias / Atrasados'],
            ...gargalos.map((g) => [
              String(g.etapa ?? ''),
              `${g.mediaDias ?? 0} dias · ${g.atrasados ?? 0} atrasados`,
            ]),
          ]
          await downloadGerarDocumento(
            {
              titulo: 'Relatórios — AcompSOLEMP',
              fileBaseName: 'Relatorios-AcompSOLEMP',
              headers,
              rows,
            },
            formato,
          )
        }}
      />
    </>
  )
}
