import { Box, Grid } from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { RankingCards } from '@/components/dashboard/RankingCards'
import { useDashboardMetrics } from '@/hooks/usePedidos'
import { formatCurrency } from '@/utils/format'
import { premiumTokens } from '@/theme/tokens'

export default function DashboardPage() {
  const { data: metrics, isLoading } = useDashboardMetrics()

  if (isLoading || !metrics) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Dashboard do Gestor"
        subtitle="Visão executiva dos processos de materiais consignados e SOLEMP"
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard title="Total" value={metrics.totalProcessos} icon={<AssignmentIcon />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="Em andamento"
            value={metrics.emAndamento}
            icon={<PendingActionsIcon />}
            color={premiumTokens.yellow}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="Concluídos"
            value={metrics.concluidos}
            icon={<CheckCircleIcon />}
            color={premiumTokens.green}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="Atrasados"
            value={metrics.atrasados}
            icon={<WarningIcon />}
            color={premiumTokens.red}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="Próx. vencimento"
            value={metrics.proximosVencimento}
            icon={<ScheduleIcon />}
            color={premiumTokens.purple}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="Tempo médio p/ pagamento"
            value={`${metrics.tempoMedioPagamento}d`}
            icon={<ScheduleIcon />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard title="Valor em aberto" value={formatCurrency(metrics.valorTotalAberto)} icon={<AttachMoneyIcon />} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard title="Pago no mês" value={formatCurrency(metrics.valorPagoMes)} icon={<AttachMoneyIcon />} color={premiumTokens.green} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard title="Aguard. assinatura" value={formatCurrency(metrics.valorAguardandoAssinatura)} icon={<AttachMoneyIcon />} color={premiumTokens.purple} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <KpiCard title="Aguard. financeiro" value={formatCurrency(metrics.valorAguardandoFinanceiro)} icon={<AttachMoneyIcon />} color={premiumTokens.yellow} />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <DashboardCharts metrics={metrics} />
      </Box>
      <RankingCards metrics={metrics} />
    </>
  )
}
