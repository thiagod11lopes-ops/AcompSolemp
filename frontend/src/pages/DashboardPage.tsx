import { useMemo, useState } from 'react'
import { Alert, Box, Button, Grid } from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ScheduleIcon from '@mui/icons-material/Schedule'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import BuildCircleIcon from '@mui/icons-material/BuildCircle'
import { format, isValid, parseISO, subYears, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { RankingCards } from '@/components/dashboard/RankingCards'
import { TotalIndenizadoCard, ValorASerIndenizadoCard } from '@/components/dashboard/TotalIndenizadoCard'
import {
  PessoasAtendidasCard,
  ProcedimentosCard,
} from '@/components/dashboard/AtendimentosKpiCards'
import { EmAndamentoCard } from '@/components/dashboard/EmAndamentoCard'
import { ConcluidosCard } from '@/components/dashboard/ConcluidosCard'
import {
  DashboardRingCard,
  ringPct,
  ringScale,
} from '@/components/dashboard/DashboardRingCard'
import {
  KpiDetalheDialog,
  kpiCol,
  type KpiDetalheColumn,
  type KpiDetalheSummary,
} from '@/components/dashboard/KpiDetalheDialog'
import { useDashboardMetrics } from '@/hooks/usePedidos'
import { formatCurrency, formatDate } from '@/utils/format'
import { premiumTokens } from '@/theme/tokens'
import type { DashboardEmpenhadoItem } from '@/types'

type KpiKey =
  | 'total'
  | 'emAndamento'
  | 'concluidos'
  | 'atrasados'
  | 'proximos'
  | 'correcoesVencidas'
  | 'tempoMedio'
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
  showPeriodoFilter?: boolean
  showTempoEtapa?: boolean
  showQuantidadePorEtapa?: boolean
}

function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function periodoAnoCorrente(): { inicio: string; fim: string } {
  const fim = endOfDay(new Date())
  const inicio = startOfDay(subYears(fim, 1))
  return { inicio: toDateInputValue(inicio), fim: toDateInputValue(fim) }
}

function filtrarEmpenhadoPorPeriodo(
  itens: DashboardEmpenhadoItem[],
  dataInicio: string,
  dataFim: string,
): DashboardEmpenhadoItem[] {
  const inicio = dataInicio ? startOfDay(parseISO(dataInicio)) : null
  const fim = dataFim ? endOfDay(parseISO(dataFim)) : null

  return itens.filter((item) => {
    const data = parseISO(item.dataEmpenho)
    if (!isValid(data)) return false
    if (inicio && isValid(inicio) && data < inicio) return false
    if (fim && isValid(fim) && data > fim) return false
    return true
  })
}

export default function DashboardPage() {
  const { data: metrics, isPending, isError, error, refetch } = useDashboardMetrics()
  const [kpiAberto, setKpiAberto] = useState<KpiKey | null>(null)
  const [mesSelecionado, setMesSelecionado] = useState(() => format(new Date(), 'yyyy-MM'))
  const [empenhadoPeriodo, setEmpenhadoPeriodo] = useState(periodoAnoCorrente)

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

  /** Card: sempre últimos 12 meses a partir de hoje. */
  const empenhadoAnoCard = useMemo(() => {
    if (!metrics) return { itens: [] as DashboardEmpenhadoItem[], valor: 0, quantidade: 0 }
    const janela = periodoAnoCorrente()
    const itens = filtrarEmpenhadoPorPeriodo(
      metrics.empenhadoItens,
      janela.inicio,
      janela.fim,
    )
    return {
      itens,
      valor: itens.reduce((acc, i) => acc + i.valor, 0),
      quantidade: itens.length,
    }
  }, [metrics])

  /** Modal: filtro Data início / Data fim (padrão = últimos 12 meses). */
  const empenhadoPeriodoFiltrado = useMemo(() => {
    if (!metrics) return { itens: [] as DashboardEmpenhadoItem[], valor: 0, quantidade: 0 }
    const itens = filtrarEmpenhadoPorPeriodo(
      metrics.empenhadoItens,
      empenhadoPeriodo.inicio,
      empenhadoPeriodo.fim,
    )
    return {
      itens,
      valor: itens.reduce((acc, i) => acc + i.valor, 0),
      quantidade: itens.length,
    }
  }, [metrics, empenhadoPeriodo.inicio, empenhadoPeriodo.fim])

  const abrirKpi = (key: KpiKey) => {
    if (key === 'totalEmpenhado') {
      setEmpenhadoPeriodo(periodoAnoCorrente())
    }
    setKpiAberto(key)
  }
  if (isPending && !metrics) return <LoadingSpinner />
  if (isError) {
    return (
      <Box sx={{ p: 2 }}>
        <PageHeader
          title="Dashboard do Gestor"
          subtitle="Visão executiva dos processos de materiais consignados e SOLEMP"
        />
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          }
        >
          {error instanceof Error ? error.message : 'Falha ao carregar as métricas do dashboard.'}
        </Alert>
      </Box>
    )
  }
  if (!metrics) return <LoadingSpinner />

  const periodoLabel =
    empenhadoPeriodo.inicio && empenhadoPeriodo.fim
      ? `${formatDate(empenhadoPeriodo.inicio)} a ${formatDate(empenhadoPeriodo.fim)}`
      : 'período selecionado'

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
      subtitle: 'PEDs ativos nos cards da timeline',
      accent: premiumTokens.yellow,
      icon: <PendingActionsIcon />,
      summaries: [
        { label: 'PEDs ativos', value: metrics.emAndamento },
        {
          label: 'Valor',
          value: formatCurrency(metrics.emAndamentoItens.reduce((a, i) => a + i.valor, 0)),
        },
        { label: 'Atrasados', value: metrics.atrasados },
        {
          label: 'Cards com PED',
          value: (metrics.emAndamentoPorEtapa ?? []).length,
        },
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
      showQuantidadePorEtapa: true,
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
    correcoesVencidas: {
      title: 'Prazos de correção vencidos',
      subtitle: 'Planilhas devolvidas com prazo de correção ultrapassado',
      accent: premiumTokens.orange,
      icon: <BuildCircleIcon />,
      summaries: [
        { label: 'Quantidade', value: metrics.correcoesVencidas },
        {
          label: 'Valor',
          value: formatCurrency(metrics.correcoesVencidasItens.reduce((a, i) => a + i.valor, 0)),
        },
      ],
      columns: [
        kpiCol.pedido,
        kpiCol.clinica,
        {
          id: 'etapaDevolveu',
          label: 'Devolvida por',
          render: (row) => String(row.etapaDevolveuNome ?? '—'),
        },
        {
          id: 'corretor',
          label: 'Quem corrige',
          render: (row) => String(row.corretorPerfil ?? '—'),
        },
        kpiCol.valor,
        {
          id: 'prazoCorrecao',
          label: 'Prazo',
          align: 'right' as const,
          render: (row) => `${Number(row.prazoCorrecaoDias ?? 0)}d`,
        },
        {
          id: 'diasAtraso',
          label: 'Dias em atraso',
          align: 'right' as const,
          render: (row) => String(row.diasEmAtraso ?? '—'),
        },
        {
          id: 'vencimento',
          label: 'Venceu em',
          render: (row) =>
            row.vencimentoEm ? formatDate(String(row.vencimentoEm)) : '—',
        },
        {
          id: 'devolvida',
          label: 'Devolvida em',
          render: (row) =>
            row.devolvidaEm ? formatDate(String(row.devolvidaEm)) : '—',
        },
      ],
      rows: metrics.correcoesVencidasItens as unknown as Record<string, unknown>[],
      emptyMessage: 'Nenhum prazo de correção vencido.',
    },
    tempoMedio: {
      title: 'Tempo Médio de Finalização',
      subtitle: `Média de ${metrics.tempoMedioPagamento} dias do envio da planilha até a conclusão na timeline`,
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
    aguardandoEmpenho: {
      title: 'Aguardando Empenho',
      subtitle: 'Solemps em Rascunho ainda sem empenho',
      accent: premiumTokens.orange,
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
      emptyMessage: 'Nenhuma Solemp em Rascunho aguardando empenho.',
    },
    totalEmpenhado: {
      title: 'Total empenhado no ano',
      subtitle: `Empenhos de ${periodoLabel}`,
      accent: premiumTokens.green,
      icon: <AccountBalanceIcon />,
      summaries: [
        { label: 'Valor no período', value: formatCurrency(empenhadoPeriodoFiltrado.valor) },
        { label: 'Quantidade', value: empenhadoPeriodoFiltrado.quantidade },
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
      rows: empenhadoPeriodoFiltrado.itens as unknown as Record<string, unknown>[],
      emptyMessage: 'Nenhum empenho no período selecionado.',
      showPeriodoFilter: true,
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
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardRingCard
            title="Total"
            value={metrics.totalProcessos}
            rings={[
              ringPct(metrics.concluidos, metrics.totalProcessos),
              ringPct(metrics.emAndamento, metrics.totalProcessos),
              ringPct(metrics.atrasados, metrics.totalProcessos),
            ]}
            palette="brand"
            onClick={() => setKpiAberto('total')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardRingCard
            title="Atrasados"
            value={metrics.atrasados}
            rings={[
              ringPct(metrics.atrasados, metrics.totalProcessos),
              ringPct(metrics.atrasados, Math.max(metrics.emAndamento, 1)),
              ringScale(metrics.atrasados, Math.max(metrics.atrasados, 5)),
            ]}
            palette="alert"
            onClick={() => setKpiAberto('atrasados')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardRingCard
            title="Próx. Vencimento"
            value={metrics.proximosVencimento}
            rings={[
              ringPct(metrics.proximosVencimento, metrics.totalProcessos),
              ringPct(metrics.proximosVencimento, Math.max(metrics.emAndamento, 1)),
              ringScale(metrics.proximosVencimento, Math.max(metrics.proximosVencimento, 5)),
            ]}
            palette="info"
            onClick={() => setKpiAberto('proximos')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardRingCard
            title="Correções Vencidas"
            value={metrics.correcoesVencidas}
            rings={[
              ringPct(metrics.correcoesVencidas, metrics.totalProcessos),
              ringScale(metrics.correcoesVencidas, Math.max(metrics.correcoesVencidas, 5)),
              ringPct(metrics.correcoesVencidas, Math.max(metrics.emAndamento, 1)),
            ]}
            palette="warning"
            onClick={() => setKpiAberto('correcoesVencidas')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardRingCard
            title="Aguardando Empenho"
            value={formatCurrency(metrics.valorAguardandoEmpenho)}
            rings={[
              ringScale(metrics.quantidadeAguardandoEmpenho, Math.max(metrics.quantidadeAguardandoEmpenho, 5)),
              ringPct(metrics.quantidadeAguardandoEmpenho, Math.max(metrics.emAndamento, 1)),
              ringScale(metrics.valorAguardandoEmpenho, Math.max(metrics.valorAguardandoEmpenho, 1)),
            ]}
            palette="warning"
            onClick={() => setKpiAberto('aguardandoEmpenho')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardRingCard
            title="Total Empenhado do Mês"
            value={formatCurrency(mesFiltrado.valor)}
            rings={[
              ringScale(mesFiltrado.quantidade, Math.max(mesFiltrado.quantidade, 5)),
              ringScale(mesFiltrado.valor, Math.max(mesFiltrado.valor, empenhadoAnoCard.valor, 1)),
              ringPct(mesFiltrado.quantidade, Math.max(empenhadoAnoCard.quantidade, 1)),
            ]}
            palette="brand"
            onClick={() => setKpiAberto('empenhadoMes')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardRingCard
            title="Total Empenhado no Ano"
            value={formatCurrency(empenhadoAnoCard.valor)}
            rings={[
              ringScale(empenhadoAnoCard.quantidade, Math.max(empenhadoAnoCard.quantidade, 5)),
              ringScale(empenhadoAnoCard.valor, Math.max(empenhadoAnoCard.valor, 1)),
              ringPct(mesFiltrado.valor, Math.max(empenhadoAnoCard.valor, 1)),
            ]}
            palette="success"
            onClick={() => abrirKpi('totalEmpenhado')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DashboardRingCard
            title="Tempo Médio de Finalização"
            value={`${metrics.tempoMedioPagamento}d`}
            rings={[
              Math.min(100, Math.max(2, (1 - Math.min(Math.max(metrics.tempoMedioPagamento, 1), 30) / 30) * 100)),
              ringPct(metrics.concluidos, metrics.totalProcessos),
              ringScale(metrics.concluidos, Math.max(metrics.totalProcessos, 1)),
            ]}
            palette="brand"
            onClick={() => setKpiAberto('tempoMedio')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1, alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              height: '100%',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                flex: 1,
                minHeight: 0,
                '& > *': { minHeight: 0, height: '100%' },
              }}
            >
              <ValorASerIndenizadoCard
                linhas={metrics.valorASerIndenizadoLinhas ?? []}
              />
              <PessoasAtendidasCard value={metrics.pessoasAtendidas ?? 0} />
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                flex: 1,
                minHeight: 0,
                '& > *': { minHeight: 0, height: '100%' },
              }}
            >
              <TotalIndenizadoCard
                linhas={metrics.totalIndenizadoLinhas ?? []}
              />
              <ProcedimentosCard value={metrics.procedimentos ?? 0} />
            </Box>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
          <Box sx={{ flex: 1, width: '100%', display: 'flex', '& > *': { flex: 1, width: '100%' } }}>
            <EmAndamentoCard
              total={metrics.emAndamento}
              porEtapa={metrics.emAndamentoPorEtapa ?? []}
              onClick={() => setKpiAberto('emAndamento')}
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
          <Box sx={{ flex: 1, width: '100%', display: 'flex', '& > *': { flex: 1, width: '100%' } }}>
            <ConcluidosCard
              concluidos={metrics.concluidos}
              totalProcessos={metrics.totalProcessos}
              emAndamento={metrics.emAndamento}
              valorConcluidos={metrics.concluidosItens.reduce((a, i) => a + i.valor, 0)}
              tempoMedioDias={metrics.tempoMedioPagamento}
              onClick={() => setKpiAberto('concluidos')}
            />
          </Box>
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
          showPeriodoFilter={ativo.showPeriodoFilter}
          periodoInicio={ativo.showPeriodoFilter ? empenhadoPeriodo.inicio : undefined}
          periodoFim={ativo.showPeriodoFilter ? empenhadoPeriodo.fim : undefined}
          onPeriodoInicioChange={
            ativo.showPeriodoFilter
              ? (value) => setEmpenhadoPeriodo((prev) => ({ ...prev, inicio: value }))
              : undefined
          }
          onPeriodoFimChange={
            ativo.showPeriodoFilter
              ? (value) => setEmpenhadoPeriodo((prev) => ({ ...prev, fim: value }))
              : undefined
          }
          tempoPorEtapa={ativo.showTempoEtapa ? metrics.tempoMedioPorEtapa : undefined}
          quantidadePorEtapa={
            ativo.showQuantidadePorEtapa ? metrics.emAndamentoPorEtapa : undefined
          }
        />
      )}
    </>
  )
}
