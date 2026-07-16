import { Grid, Paper, Typography } from '@mui/material'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useDashboardMetrics } from '@/hooks/usePedidos'
import { formatCurrency } from '@/utils/format'
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
  const { data: metrics, isLoading } = useDashboardMetrics()

  if (isLoading || !metrics) return <LoadingSpinner />

  const relatorioResumo = [
    { indicador: 'Total de processos', valor: metrics.totalProcessos },
    { indicador: 'Em andamento', valor: metrics.emAndamento },
    { indicador: 'Concluídos', valor: metrics.concluidos },
    { indicador: 'Atrasados', valor: metrics.atrasados },
    { indicador: 'Tempo médio (dias)', valor: metrics.tempoMedioPagamento },
    { indicador: 'Pago no mês', valor: formatCurrency(metrics.valorPagoMes) },
  ]

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Indicadores consolidados para análise gerencial"
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
              <BarChart data={metrics.rankingGargalos}>
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
    </>
  )
}
