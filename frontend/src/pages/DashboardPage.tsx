import { useMemo, useState } from 'react'
import { Box, Grid } from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { RankingCards } from '@/components/dashboard/RankingCards'
import { AguardandoEmpenhoDialog } from '@/components/dashboard/AguardandoEmpenhoDialog'
import { EmpenhadoMesFiltroDialog } from '@/components/dashboard/EmpenhadoMesFiltroDialog'
import { useDashboardMetrics } from '@/hooks/usePedidos'
import { formatCurrency, formatDate } from '@/utils/format'
import { premiumTokens } from '@/theme/tokens'

export default function DashboardPage() {
  const { data: metrics, isPending } = useDashboardMetrics()
  const [detalheEmpenhoAberto, setDetalheEmpenhoAberto] = useState(false)
  const [filtroMesAberto, setFiltroMesAberto] = useState(false)
  const [mesSelecionado, setMesSelecionado] = useState(() => format(new Date(), 'yyyy-MM'))

  const mesAtual = useMemo(() => {
    const chave = format(new Date(), 'yyyy-MM')
    const label = format(new Date(), 'MMMM/yyyy', { locale: ptBR })
    return {
      chave,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    }
  }, [])

  if (isPending && !metrics) return <LoadingSpinner />
  if (!metrics) return <LoadingSpinner />

  const qtdAguardando = metrics.quantidadeAguardandoEmpenho
  const subtitleAguardando =
    qtdAguardando === 0
      ? 'Nenhuma Solemp na etapa Solemp confeccionada'
      : `${qtdAguardando} Solemp${qtdAguardando === 1 ? '' : 's'} em Solemp confeccionada — clique para detalhes`

  const subtitleTotalEmpenhado = metrics.dataPrimeiroEmpenho
    ? `Total empenhado desde ${formatDate(metrics.dataPrimeiroEmpenho)}`
    : 'Nenhum empenho registrado'

  const mesFiltrado =
    metrics.totaisEmpenhadoPorMes.find((m) => m.mesChave === mesSelecionado) ??
    metrics.totaisEmpenhadoPorMes.find((m) => m.mesChave === mesAtual.chave) ?? {
      mesChave: mesAtual.chave,
      mesLabel: mesAtual.label,
      valor: 0,
      quantidade: 0,
    }

  const subtitleMes =
    mesFiltrado.quantidade === 0
      ? `${mesFiltrado.mesLabel} — clique para filtrar`
      : `${mesFiltrado.quantidade} empenho${mesFiltrado.quantidade === 1 ? '' : 's'} em ${mesFiltrado.mesLabel} — clique para filtrar`

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
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="Pago no mês"
            value={formatCurrency(metrics.valorPagoMes)}
            icon={<AttachMoneyIcon />}
            color={premiumTokens.green}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="Aguardando Empenho"
            value={formatCurrency(metrics.valorAguardandoEmpenho)}
            subtitle={subtitleAguardando}
            icon={<HourglassTopIcon />}
            color={premiumTokens.red}
            onClick={() => setDetalheEmpenhoAberto(true)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="Total Empenhado"
            value={formatCurrency(metrics.valorTotalEmpenhado)}
            subtitle={subtitleTotalEmpenhado}
            icon={<AccountBalanceIcon />}
            color={premiumTokens.green}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="Total empenhado do mês"
            value={formatCurrency(mesFiltrado.valor)}
            subtitle={subtitleMes}
            icon={<CalendarMonthIcon />}
            color={premiumTokens.primary}
            onClick={() => setFiltroMesAberto(true)}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <DashboardCharts metrics={metrics} />
      </Box>
      <RankingCards metrics={metrics} />

      <AguardandoEmpenhoDialog
        open={detalheEmpenhoAberto}
        onClose={() => setDetalheEmpenhoAberto(false)}
        itens={metrics.aguardandoEmpenhoItens}
        valorTotal={metrics.valorAguardandoEmpenho}
      />

      <EmpenhadoMesFiltroDialog
        open={filtroMesAberto}
        onClose={() => setFiltroMesAberto(false)}
        meses={metrics.totaisEmpenhadoPorMes}
        mesSelecionado={mesFiltrado.mesChave}
        onSelectMes={setMesSelecionado}
      />
    </>
  )
}
