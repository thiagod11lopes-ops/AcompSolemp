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
import { KpiCard } from '@/components/common/KpiCard'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { RankingCards } from '@/components/dashboard/RankingCards'
import { TotalIndenizadoCard, ValorASerIndenizadoCard } from '@/components/dashboard/TotalIndenizadoCard'
import { EmAndamentoCard } from '@/components/dashboard/EmAndamentoCard'
import type { TotalIndenizadoPeriodoTipo } from '@/utils/totalIndenizado'
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
  const [indenizadoPeriodoTipo, setIndenizadoPeriodoTipo] =
    useState<TotalIndenizadoPeriodoTipo>('ano')
  const [indenizadoReferencia, setIndenizadoReferencia] = useState(() => {
    const d = new Date()
    d.setMonth(0, 1)
    return d
  })

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

  const qtdAguardando = metrics.quantidadeAguardandoEmpenho
  const subtitleAguardando =
    qtdAguardando === 0
      ? 'Nenhuma Solemp em Rascunho — soma do Valor Total Div. Material'
      : `${qtdAguardando} Solemp${qtdAguardando === 1 ? '' : 's'} em Rascunho · Valor Total Div. Material`

  const subtitleTotalEmpenhado =
    empenhadoAnoCard.quantidade === 0
      ? 'Últimos 12 meses · nenhum empenho no período'
      : `${empenhadoAnoCard.quantidade} empenho${empenhadoAnoCard.quantidade === 1 ? '' : 's'} · últimos 12 meses`

  const subtitleMes =
    mesFiltrado.quantidade === 0
      ? `${mesFiltrado.mesLabel} · Valor Total Div. Material`
      : `${mesFiltrado.quantidade} empenho${mesFiltrado.quantidade === 1 ? '' : 's'} em ${mesFiltrado.mesLabel} · Valor Total Div. Material`

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
      accent: premiumTokens.red,
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
    aguardandoEmpenho: {
      title: 'Aguardando Empenho',
      subtitle: 'Solemps em Rascunho ainda sem empenho',
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
          <KpiCard
            title="Total"
            value={metrics.totalProcessos}
            subtitle="Clique para detalhes"
            icon={<AssignmentIcon />}
            onClick={() => setKpiAberto('total')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Atrasados"
            value={metrics.atrasados}
            subtitle="Clique para detalhes"
            icon={<WarningIcon />}
            color={premiumTokens.red}
            onClick={() => setKpiAberto('atrasados')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Próx. vencimento"
            value={metrics.proximosVencimento}
            subtitle="Clique para detalhes"
            icon={<ScheduleIcon />}
            color={premiumTokens.purple}
            onClick={() => setKpiAberto('proximos')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Correções vencidas"
            value={metrics.correcoesVencidas}
            subtitle="Prazo de correção ultrapassado"
            icon={<BuildCircleIcon />}
            color={premiumTokens.red}
            onClick={() => setKpiAberto('correcoesVencidas')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Tempo Médio de Finalização"
            value={`${metrics.tempoMedioPagamento}d`}
            subtitle="Clique para detalhes"
            icon={<ScheduleIcon />}
            onClick={() => setKpiAberto('tempoMedio')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            title="Aguardando Empenho"
            value={formatCurrency(metrics.valorAguardandoEmpenho)}
            subtitle={subtitleAguardando}
            icon={<HourglassTopIcon />}
            color={premiumTokens.red}
            onClick={() => setKpiAberto('aguardandoEmpenho')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            title="Total empenhado do mês"
            value={formatCurrency(mesFiltrado.valor)}
            subtitle={subtitleMes}
            icon={<CalendarMonthIcon />}
            color={premiumTokens.primary}
            onClick={() => setKpiAberto('empenhadoMes')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <KpiCard
            title="Total empenhado no ano"
            value={formatCurrency(empenhadoAnoCard.valor)}
            subtitle={subtitleTotalEmpenhado}
            icon={<AccountBalanceIcon />}
            color={premiumTokens.green}
            onClick={() => abrirKpi('totalEmpenhado')}
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
              '& > *': { flex: 1, minHeight: 0 },
            }}
          >
            <ValorASerIndenizadoCard
              linhas={metrics.valorASerIndenizadoLinhas ?? []}
              periodoTipo={indenizadoPeriodoTipo}
              referencia={indenizadoReferencia}
              onPeriodoTipoChange={setIndenizadoPeriodoTipo}
              onReferenciaChange={setIndenizadoReferencia}
            />
            <TotalIndenizadoCard
              linhas={metrics.totalIndenizadoLinhas ?? []}
              periodoTipo={indenizadoPeriodoTipo}
              referencia={indenizadoReferencia}
              onPeriodoTipoChange={setIndenizadoPeriodoTipo}
              onReferenciaChange={setIndenizadoReferencia}
            />
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
            <KpiCard
              title="Concluídos"
              value={metrics.concluidos}
              subtitle="Clique para detalhes"
              icon={<CheckCircleIcon />}
              color={premiumTokens.green}
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
