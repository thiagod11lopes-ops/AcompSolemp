import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import TimelineIcon from '@mui/icons-material/Timeline'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusChip } from '@/components/common/StatusChip'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { usePedidos } from '@/hooks/usePedidos'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { calcularProgressoTimeline } from '@/utils/portal'
import { TIMELINE_ETAPA_META } from '@/utils/timelineFlow'
import { formatCurrency, formatDate, formatNip } from '@/utils/format'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'

type FiltroStatus = 'TODAS' | 'EM_ANDAMENTO' | 'CONCLUIDAS' | 'ATRASADAS'

const FASE_ORDEM = [
  'Solicitação da Clínica',
  'Div. de Material',
  'Finanças',
  'Finanças Pagamento',
  'Concluído',
] as const

function getEtapasAtivas(pedido: PedidoComDetalhes, etapas: WorkflowEtapa[]): WorkflowEtapa[] {
  if (pedido.etapasAtivasIds?.length) {
    return etapas.filter((e) => pedido.etapasAtivasIds.includes(e.id))
  }
  return [pedido.etapaAtual]
}

function getFasePedido(pedido: PedidoComDetalhes, etapas: WorkflowEtapa[]): string {
  if (pedido.concluido) return 'Concluído'
  const ativas = getEtapasAtivas(pedido, etapas)
  for (const etapa of ativas) {
    const grupo = TIMELINE_ETAPA_META[etapa.chave]?.grupo
    if (grupo) return grupo
  }
  return 'Solicitação da Clínica'
}

function passaFiltro(pedido: PedidoComDetalhes, filtro: FiltroStatus): boolean {
  if (filtro === 'TODAS') return true
  if (filtro === 'CONCLUIDAS') return pedido.concluido
  if (filtro === 'ATRASADAS') return !pedido.concluido && pedido.prazoStatus === 'ATRASADO'
  return !pedido.concluido
}

function passaBusca(pedido: PedidoComDetalhes, busca: string): boolean {
  const q = busca.trim().toLowerCase()
  if (!q) return true
  const campos = [
    pedido.numero,
    pedido.clinica.nome,
    pedido.empresa.nomeFantasia,
    pedido.material.descricao,
    pedido.etapaAtual.nome,
    pedido.paciente?.nome,
    pedido.paciente?.nip,
    pedido.solemp?.numero,
    pedido.dadosClinica?.procedimento,
    pedido.dadosClinica?.medico,
  ]
  return campos.some((c) => c?.toLowerCase().includes(q))
}

export default function GestorTimelinesPage() {
  const navigate = useNavigate()
  const { data: pedidos = [], isLoading } = usePedidos()
  const { data: etapas = [] } = useWorkflowEtapas()
  const [filtro, setFiltro] = useState<FiltroStatus>('TODAS')
  const [busca, setBusca] = useState('')

  const ordenadas = useMemo(
    () => [...etapas].sort((a, b) => a.ordem - b.ordem),
    [etapas],
  )

  const filtrados = useMemo(
    () =>
      pedidos
        .filter((p) => passaFiltro(p, filtro))
        .filter((p) => passaBusca(p, busca))
        .sort(
          (a, b) =>
            new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime(),
        ),
    [pedidos, filtro, busca],
  )

  const porFase = useMemo(() => {
    const mapa = new Map<string, PedidoComDetalhes[]>()
    for (const fase of FASE_ORDEM) mapa.set(fase, [])
    for (const pedido of filtrados) {
      const fase = getFasePedido(pedido, etapas)
      if (!mapa.has(fase)) mapa.set(fase, [])
      mapa.get(fase)!.push(pedido)
    }
    return FASE_ORDEM.map((fase) => ({
      fase,
      itens: mapa.get(fase) ?? [],
    })).filter((g) => g.itens.length > 0)
  }, [filtrados, etapas])

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Timeline"
        subtitle={`${filtrados.length} timeline(s) · visão geral de todos os processos do sistema`}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, alignItems: 'center' }}>
        <Tabs
          value={filtro}
          onChange={(_, v: FiltroStatus) => setFiltro(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ flexGrow: 1, minWidth: 280 }}
        >
          <Tab value="TODAS" label={`Todas (${pedidos.length})`} />
          <Tab
            value="EM_ANDAMENTO"
            label={`Em andamento (${pedidos.filter((p) => !p.concluido).length})`}
          />
          <Tab
            value="CONCLUIDAS"
            label={`Concluídas (${pedidos.filter((p) => p.concluido).length})`}
          />
          <Tab
            value="ATRASADAS"
            label={`Atrasadas (${pedidos.filter((p) => !p.concluido && p.prazoStatus === 'ATRASADO').length})`}
          />
        </Tabs>
        <TextField
          size="small"
          label="Buscar"
          placeholder="Número, clínica, paciente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          sx={{ minWidth: 240 }}
        />
      </Box>

      {filtrados.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <TimelineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            Nenhuma timeline encontrada com os filtros atuais.
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 3 }}>
          {porFase.map(({ fase, itens }) => (
            <Box key={fase}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {fase}
                </Typography>
                <Chip label={itens.length} size="small" color="primary" variant="outlined" />
              </Box>
              <Grid container spacing={2}>
                {itens.map((pedido) => {
                  const ativas = getEtapasAtivas(pedido, etapas)
                  const etapaIndex = ordenadas.findIndex((e) => e.id === pedido.etapaAtualId)
                  const progresso = calcularProgressoTimeline(
                    pedido.concluido ? ordenadas.length - 1 : etapaIndex,
                    ordenadas.length,
                  )

                  return (
                    <Grid key={pedido.id} size={{ xs: 12, md: 6, lg: 4 }}>
                      <Card
                        variant="outlined"
                        sx={{
                          height: '100%',
                          transition: 'box-shadow 0.2s',
                          '&:hover': { boxShadow: 4 },
                        }}
                      >
                        <CardActionArea
                          onClick={() => navigate(`/gestor/timeline/${pedido.id}`)}
                          sx={{ height: '100%' }}
                        >
                          <CardContent>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 1,
                                mb: 1,
                              }}
                            >
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {pedido.numero}
                              </Typography>
                              <StatusChip
                                status={pedido.prazoStatus}
                                concluido={pedido.concluido}
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {pedido.clinica.nome}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {pedido.paciente
                                ? `${pedido.paciente.nome} · NIP ${formatNip(pedido.paciente.nip)}`
                                : `${pedido.material.descricao} · ${pedido.empresa.nomeFantasia}`}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                              {ativas.map((etapa) => (
                                <Chip
                                  key={etapa.id}
                                  label={etapa.nome}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                              <Chip
                                label={formatCurrency(pedido.valor)}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={formatDate(pedido.dataSolicitacao)}
                                size="small"
                                variant="outlined"
                              />
                              {pedido.solemp && (
                                <Chip
                                  label={pedido.solemp.numero}
                                  size="small"
                                  color="primary"
                                />
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={progresso}
                                sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {progresso}%
                              </Typography>
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            </Box>
          ))}
        </Box>
      )}
    </>
  )
}
