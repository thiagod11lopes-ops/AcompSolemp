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
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { RankingCards } from '@/components/dashboard/RankingCards'
import {
  KpiDetalheDialog,
  kpiCol,
  type KpiDetalheColumn,
  type KpiDetalheSummary,
} from '@/components/dashboard/KpiDetalheDialog'
import { useDashboardMetrics } from '@/hooks/usePedidos'
import { formatCurrency, formatDate } from '@/utils/format'
import { premiumTokens } from '@/theme/tokens'

type KpiKey =
  | 'total'
  | 'emAndamento'
  | 'concluidos'
  | 'atrasados'
  | 'proximos'
  | 'tempoMedio'
  | 'pagoMes'
  | 'aguardandoEmpenho'
  | 'totalEmpenhado'
  | 'empenhadoMes'

interface KpiModalConfig {
  title: string
  subtitle: string
  accent: string
  icon: ReactNode
  summaries: KpiDetalheSummary[]
  columns: KpiDetalheColumn[]
  rows: Record<string, unknown>[]
  emptyMessage: string
  showMesFilter?: boolean
  showTempoEtapa?: boolean
}

export default function DashboardPage() {
  const { data: metrics, isPending } = useDashboardMetrics()
  const [kpiAberto, setKpiAberto] = useState<KpiKey | null>(null)
  const [mesSelecionado, setMesSelecionado] = useState(() => format(new Date(), 'yyyy-MM'))

  const mesAtual = useMemo(() => {
    const chave = format(new Date(), 'yyyy-MM')
    const label = format(new Date(), 'MMMM/yyyy', { locale: ptBR })
    return {
      chave,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    }
  }, [])

  const mesFiltrado = useMemo(() => {
    if (!metrics) {
      return {
        mesChave: mesAtual.chave,
        mesLabel: mesAtual.label,
        valor: 0,
        quantidade: 0,
      }
    }
    return (
      metrics.totaisEmpenhadoPorMes.find((m) => m.mesChave === mesSelecionado) ??
      metrics.totaisEmpenhadoPorMes.find((m) => m.mesChave === mesAtual.chave) ?? {
        mesChave: mesAtual.chave,
        mesLabel: mesAtual.label,
        valor: 0,
        quantidade: 0,
      }
    )
  }, [metrics, mesSelecionado, mesAtual])

  const empenhadoMesItens = useMemo(() => {
    if (!metrics) return []
    return metrics.empenhadoItens.filter((item) => item.mesChave === mesFiltrado.mesChave)
  }, [metrics, mesFiltrado.mesChave])

  if (isPending && !metrics) return <LoadingSpinner />
  if (!metrics) return <LoadingSpinner />

  const qtdAguardando = metrics.quantidadeAguardandoEmpenho
  const subtitleAguardando =
    qtdAguardando === 0
      ? 'Nenhuma Solemp na etapa Solemp confeccionada — clique para detalhes'
      : `${qtdAguardando} Solemp${qtdAguardando === 1 ? '' : 's'} em Solemp confeccionada — clique para detalhes`

  const subtitleTotalEmpenhado = metrics.dataPrimeiroEmpenho
    ? `Total empenhado desde ${formatDate(metrics.dataPrimeiroEmpenho)} — clique para detalhes`
    : 'Nenhum empenho registrado — clique para detalhes'

  const subtitleMes =
    mesFiltrado.quantidade === 0
      ? `${mesFiltrado.mesLabel} — clique para detalhes`
      : `${mesFiltrado.quantidade} empenho${mesFiltrado.quantidade === 1 ? '' : 's'} em ${mesFiltrado.mesLabel} — clique para detalhes`

  const modalConfig: Record<KpiKey, KpiModalConfig> = {
    total: {
      title: 'Total de processos',
      subtitle: 'Todos os processos registrados no sistema',
      accent: premiumTokens.primary,
      icon: <AssignmentIcon />,
      summaries: [
        { label: 'Quantidade', value: metrics.totalProcessos },
        {
          label: 'Valor total',
          value: formatCurrency(metrics.todosItens.reduce((a, i) => a + i.valor, 0)),
        },
        { label: 'Em andamento', value: metrics.emAndamento },
        { label: 'Concluídos', value: metrics.concluidos },
      ],
      columns: [
        kpiCol.pedido,
        kpiCol.clinica,
        kpiCol.empresa,
        kpiCol.etapa,
        kpiCol.valor,
        kpiCol.solemp,
        kpiCol.status,
        kpiCol.inicio,
      ],
      rows: metrics.todosItens as unknown as Record<string, unknown>[],
      emptyMessage: 'Nenhum processo cadastrado.',
    },
    emAndamento: {
      title: 'Processos em andamento',
      subtitle: 'Processos ainda não finalizados',
      accent: premiumTokens.yellow,
      icon: <PendingActionsIcon />,
      summaries: [
        { label: 'Quantidade', value: metrics.emAndamento },
        {
          label: 'Valor',
          value: formatCurrency(metrics.emAndamentoItens.reduce((a, i) => a + i.valor, 0)),
        },
        { label: 'Atrasados', value: metrics.atrasados },
      ],
      columns: [
        kpiCol.pedido,
        kpiCol.clinica,
        kpiCol.etapa,
        kpiCol.valor,
        kpiCol.prazo,
        kpiCol.diasEtapa,
        kpiCol.inicio,
      ],
      rows: metrics.emAndamentoItens as unknown as Record<string, unknown>[],
      emptyMessage: 'Nenhum processo em andamento.',
    },
    concluidos: {
      title: 'Processos concluídos',
      subtitle: 'Processos finalizados de ponta a ponta',
      accent: premiumTokens.green,
      icon: <CheckCircleIcon />,
      summaries: [
        { label: 'Quantidade', value: metrics.concluidos },
        {
          label: 'Valor',
          value: formatCurrency(metrics.concluidosItens.reduce((a, i) => a + i.valor, 0)),
        },
        { label: 'Tempo médio', value: `${metrics.tempoMedioPagamento}d` },
      ],
      columns: [
        kpiCol.pedido,
        kpiCol.clinica,
        kpiCol.empresa,
        kpiCol.valor,
        kpiCol.solemp,
        kpiCol.diasConclusao,
        kpiCol.inicio,
      ],
      rows: metrics.concluidosItens as unknown as Record<string, unknown>[],
      emptyMessage: 'Nenhum processo concluído.',
    },
    atrasados: {
      title: 'Processos atrasados',
      subtitle: 'Processos com prazo vencido na etapa atual',
      accent: premiumTokens.red,
      icon: <WarningIcon />,
      summaries: [
        { label: 'Quantidade', value: metrics.atrasados },
        {
          label: 'Valor',
          value: formatCurrency(metrics.atrasadosItens.reduce((a, i) => a + i.valor, 0)),
        },
      ],
      columns: [
        kpiCol.pedido,
        kpiCol.clinica,
        kpiCol.etapa,
        kpiCol.valor,
        kpiCol.diasEtapa,
        kpiCol.diasRestantes,
        kpiCol.inicio,
      ],
      rows: metrics.atrasadosItens as unknown as Record<string, unknown>[],
      emptyMessage: 'Nenhum processo atrasado no momento.',
    },
    proximos: {
      title: 'Próximos do vencimento',
      subtitle: 'Processos próximos de estourar o prazo da etapa',
      accent: premiumTokens.purple,
      icon: <ScheduleIcon />,
      summaries: [
        { label: 'Quantidade', value: metrics.proximosVencimento },
        {
          label: 'Valor',
          value: formatCurrency(metrics.proximosVencimentoItens.reduce((a, i) => a + i.valor, 0)),
        },
      ],
      columns: [
        kpiCol.pedido,
        kpiCol.clinica,
        kpiCol.etapa,
        kpiCol.valor,
        kpiCol.diasRestantes,
        kpiCol.diasEtapa,
        kpiCol.inicio,
      ],
      rows: metrics.proximosVencimentoItens as unknown as Record<string, unknown>[],
      emptyMessage: 'Nenhum processo próximo do vencimento.',
    },
    tempoMedio: {
      title: 'Tempo médio até conclusão',
      subtitle: `Média de ${metrics.tempoMedioPagamento} dias entre solicitação e conclusão`,
      accent: premiumTokens.primary,
      icon: <ScheduleIcon />,
      summaries: [
        { label: 'Média geral', value: `${metrics.tempoMedioPagamento}d` },
        { label: 'Processos concluídos', value: metrics.concluidos },
      ],
      columns: [
        kpiCol.pedido,
        kpiCol.clinica,
        kpiCol.valor,
        kpiCol.solemp,
        kpiCol.diasConclusao,
        kpiCol.inicio,
      ],
      rows: metrics.concluidosItens as unknown as Record<string, unknown>[],
      emptyMessage: 'Sem processos concluídos para calcular o tempo médio.',
      showTempoEtapa: true,
    },
    pagoMes: {
      title: 'Pago no mês',
      subtitle: 'Processos concluídos nos últimos 30 dias',
      accent: premiumTokens.green,
      icon: <AttachMoneyIcon />,
      summaries: [
        { label: 'Valor', value: formatCurrency(metrics.valorPagoMes) },
        { label: 'Quantidade', value: metrics.quantidadePagoMes },
      ],
      columns: [
        kpiCol.pedido,
        kpiCol.clinica,
        kpiCol.empresa,
        kpiCol.valor,
        kpiCol.solemp,
        kpiCol.diasConclusao,
        kpiCol.inicio,
      ],
      rows: metrics.pagoMesItens as unknown as Record<string, unknown>[],
      emptyMessage: 'Nenhum pagamento registrado nos últimos 30 dias.',
    },
    aguardandoEmpenho: {
      title: 'Aguardando Empenho',
      subtitle: 'Solemps confeccionadas ainda sem empenho',
      accent: premiumTokens.red,
      icon: <HourglassTopIcon />,
      summaries: [
        { label: 'Valor', value: formatCurrency(metrics.valorAguardandoEmpenho) },
        { label: 'Quantidade', value: metrics.quantidadeAguardandoEmpenho },
      ],
      columns: [
        {
          id: 'solemp',
          label: 'SOLEMP',
          render: (row) => (
            <Box component="span" sx={{ fontWeight: 600 }}>
              {String(row.solempNumero ?? '—')}
            </Box>
          ),
        },
        kpiCol.setor,
        {
          id: 'setorNome',
          label: 'Nome',
          render: (row) => String(row.setorNome ?? '—'),
        },
        kpiCol.valor,
        kpiCol.pedido,
        kpiCol.diasEtapa,
        kpiCol.inicio,
      ],
      rows: metrics.aguardandoEmpenhoItens as unknown as Record<string, unknown>[],
      emptyMessage: 'Nenhuma Solemp confeccionada aguardando empenho.',
    },
    totalEmpenhado: {
      title: 'Total Empenhado',
      subtitle: metrics.dataPrimeiroEmpenho
        ? `Todos os empenhos desde ${formatDate(metrics.dataPrimeiroEmpenho)}`
        : 'Todos os empenhos registrados',
      accent: premiumTokens.green,
      icon: <AccountBalanceIcon />,
      summaries: [
        { label: 'Valor total', value: formatCurrency(metrics.valorTotalEmpenhado) },
        { label: 'Quantidade', value: metrics.quantidadeTotalEmpenhado },
      ],
      columns: [
        kpiCol.empenho,
        kpiCol.solemp,
        kpiCol.setor,
        kpiCol.clinica,
        kpiCol.empresa,
        kpiCol.valor,
        kpiCol.dataEmpenho,
        kpiCol.mes,
        kpiCol.pedido,
      ],
      rows: metrics.empenhadoItens as unknown as Record<string, unknown>[],
      emptyMessage: 'Nenhum empenho registrado ainda.',
    },
    empenhadoMes: {
      title: 'Total empenhado do mês',
      subtitle: `Empenhos de ${mesFiltrado.mesLabel}`,
      accent: premiumTokens.primary,
      icon: <CalendarMonthIcon />,
      summaries: [
        { label: 'Valor do mês', value: formatCurrency(mesFiltrado.valor) },
        { label: 'Quantidade', value: mesFiltrado.quantidade },
      ],
      columns: [
        kpiCol.empenho,
        kpiCol.solemp,
        kpiCol.setor,
        kpiCol.clinica,
        kpiCol.valor,
        kpiCol.dataEmpenho,
        kpiCol.pedido,
      ],
      rows: empenhadoMesItens as unknown as Record<string, unknown>[],
      emptyMessage: `Nenhum empenho em ${mesFiltrado.mesLabel}.`,
      showMesFilter: true,
    },
  }

  const ativo = kpiAberto ? modalConfig[kpiAberto] : null

  return (
    <>
      <PageHeader
        title="Dashboard do Gestor"
        subtitle="Visão executiva dos processos de materiais consignados e SOLEMP"
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="Total"
            value={metrics.totalProcessos}
            subtitle="Clique para detalhes"
            icon={<AssignmentIcon />}
            onClick={() => setKpiAberto('total')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="Em andamento"
            value={metrics.emAndamento}
            subtitle="Clique para detalhes"
            icon={<PendingActionsIcon />}
            color={premiumTokens.yellow}
            onClick={() => setKpiAberto('emAndamento')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="Concluídos"
            value={metrics.concluidos}
            subtitle="Clique para detalhes"
            icon={<CheckCircleIcon />}
            color={premiumTokens.green}
            onClick={() => setKpiAberto('concluidos')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="Atrasados"
            value={metrics.atrasados}
            subtitle="Clique para detalhes"
            icon={<WarningIcon />}
            color={premiumTokens.red}
            onClick={() => setKpiAberto('atrasados')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="Próx. vencimento"
            value={metrics.proximosVencimento}
            subtitle="Clique para detalhes"
            icon={<ScheduleIcon />}
            color={premiumTokens.purple}
            onClick={() => setKpiAberto('proximos')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <KpiCard
            title="Tempo médio p/ pagamento"
            value={`${metrics.tempoMedioPagamento}d`}
            subtitle="Clique para detalhes"
            icon={<ScheduleIcon />}
            onClick={() => setKpiAberto('tempoMedio')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="Pago no mês"
            value={formatCurrency(metrics.valorPagoMes)}
            subtitle="Clique para detalhes"
            icon={<AttachMoneyIcon />}
            color={premiumTokens.green}
            onClick={() => setKpiAberto('pagoMes')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="Aguardando Empenho"
            value={formatCurrency(metrics.valorAguardandoEmpenho)}
            subtitle={subtitleAguardando}
            icon={<HourglassTopIcon />}
            color={premiumTokens.red}
            onClick={() => setKpiAberto('aguardandoEmpenho')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="Total empenhado do mês"
            value={formatCurrency(mesFiltrado.valor)}
            subtitle={subtitleMes}
            icon={<CalendarMonthIcon />}
            color={premiumTokens.primary}
            onClick={() => setKpiAberto('empenhadoMes')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <KpiCard
            title="Total Empenhado"
            value={formatCurrency(metrics.valorTotalEmpenhado)}
            subtitle={subtitleTotalEmpenhado}
            icon={<AccountBalanceIcon />}
            color={premiumTokens.green}
            onClick={() => setKpiAberto('totalEmpenhado')}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <DashboardCharts metrics={metrics} />
      </Box>
      <RankingCards metrics={metrics} />

      {ativo && (
        <KpiDetalheDialog
          open={kpiAberto !== null}
          onClose={() => setKpiAberto(null)}
          title={ativo.title}
          subtitle={ativo.subtitle}
          accent={ativo.accent}
          icon={ativo.icon}
          summaries={ativo.summaries}
          columns={ativo.columns}
          rows={ativo.rows}
          emptyMessage={ativo.emptyMessage}
          meses={ativo.showMesFilter ? metrics.totaisEmpenhadoPorMes : undefined}
          mesSelecionado={ativo.showMesFilter ? mesFiltrado.mesChave : undefined}
          onSelectMes={ativo.showMesFilter ? setMesSelecionado : undefined}
          tempoPorEtapa={ativo.showTempoEtapa ? metrics.tempoMedioPorEtapa : undefined}
        />
      )}
    </>
  )
}
