import { useMemo, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import TimelineIcon from '@mui/icons-material/Timeline'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusChip } from '@/components/common/StatusChip'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useDeleteGestorPedido, useDemoPedidos, usePedidos } from '@/hooks/usePedidos'
import { useDemoWorkflowEtapas, useWorkflowEtapas } from '@/hooks/useCadastros'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { calcularProgressoTimeline } from '@/utils/portal'
import { TIMELINE_ETAPA_META } from '@/utils/timelineFlow'
import { formatCurrency, formatDate, formatNip } from '@/utils/format'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'

type FiltroStatus = 'TODAS' | 'EM_ANDAMENTO' | 'CONCLUIDAS' | 'ATRASADAS'
type FonteTimeline = 'organizacao' | 'demonstracao'

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
  const location = useLocation()
  const { isDemo, navigatePortal } = usePortalPaths()
  const [fonte, setFonte] = useState<FonteTimeline>(isDemo ? 'demonstracao' : 'organizacao')
  const { data: pedidosOrg = [], isLoading: loadingOrg } = usePedidos()
  const { data: pedidosDemo = [], isLoading: loadingDemo } = useDemoPedidos()
  const deletePedido = useDeleteGestorPedido()
  const { data: etapasOrg = [] } = useWorkflowEtapas()
  const { data: etapasDemo = [] } = useDemoWorkflowEtapas()
  const [filtro, setFiltro] = useState<FiltroStatus>('TODAS')
  const [busca, setBusca] = useState('')
  const [pedidoExcluir, setPedidoExcluir] = useState<PedidoComDetalhes | null>(null)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  useEffect(() => {
    const state = location.state as { fonte?: FonteTimeline } | null
    if (state?.fonte === 'demonstracao') {
      setFonte('demonstracao')
    }
  }, [location.state])

  const mostraDemo = isDemo || fonte === 'demonstracao'
  const pedidos = mostraDemo ? pedidosDemo : pedidosOrg
  const isLoading = mostraDemo ? loadingDemo : loadingOrg
  const etapas = mostraDemo ? etapasDemo : etapasOrg

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

  const handleConfirmarExclusao = async () => {
    if (!pedidoExcluir) return
    setErroExclusao(null)
    try {
      await deletePedido.mutateAsync(pedidoExcluir.id)
      setPedidoExcluir(null)
    } catch (error) {
      setErroExclusao(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir a timeline. Tente novamente.',
      )
    }
  }

  if (isLoading) return <LoadingSpinner />

  const abrirTimeline = (pedidoId: string) => {
    if (isDemo) {
      navigatePortal(`/gestor/timeline/${pedidoId}`)
      return
    }
    if (mostraDemo) {
      navigate(`/gestor/timeline/${pedidoId}?fonte=demo`)
      return
    }
    navigate(`/gestor/timeline/${pedidoId}`)
  }

  return (
    <>
      <PageHeader
        title="Timeline"
        subtitle={
          mostraDemo
            ? `${filtrados.length} timeline(s) de demonstração · armazenamento local (IndexedDB)`
            : `${filtrados.length} timeline(s) · visão geral de todos os processos do sistema`
        }
      />

      {!isDemo && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Timelines criadas na demonstração (clínica, auditoria etc.) aparecem na aba
          &quot;Demonstração&quot; abaixo ou ao abrir &quot;Gestor — Visão Geral&quot; no modal de
          exemplo.
        </Alert>
      )}

      {!isDemo && (
        <Tabs
          value={fonte}
          onChange={(_, value: FonteTimeline) => setFonte(value)}
          sx={{ mb: 2 }}
        >
          <Tab value="organizacao" label={`Organização (${pedidosOrg.length})`} />
          <Tab value="demonstracao" label={`Demonstração (${pedidosDemo.length})`} />
        </Tabs>
      )}

      {mostraDemo && (
        <Chip label="Modo demonstração" color="warning" size="small" sx={{ mb: 2 }} />
      )}

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
                          onClick={() => abrirTimeline(pedido.id)}
                          sx={{ height: '100%' }}
                        >
                          <CardContent>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 1,
                                mb: 1,
                                alignItems: 'flex-start',
                              }}
                            >
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {pedido.numero}
                              </Typography>
                              <Box
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <StatusChip
                                  status={pedido.prazoStatus}
                                  concluido={pedido.concluido}
                                />
                                <Tooltip title="Excluir timeline">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    aria-label={`Excluir timeline ${pedido.numero}`}
                                    onClick={() => {
                                      setErroExclusao(null)
                                      setPedidoExcluir(pedido)
                                    }}
                                  >
                                    <DeleteOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
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

      <Dialog
        open={Boolean(pedidoExcluir)}
        onClose={() => !deletePedido.isPending && setPedidoExcluir(null)}
      >
        <DialogTitle>Excluir timeline</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Deseja realmente excluir a timeline <strong>{pedidoExcluir?.numero}</strong> da clínica{' '}
            <strong>{pedidoExcluir?.clinica.nome}</strong>?
            {mostraDemo
              ? ' Ela será removida do exemplo local (IndexedDB).'
              : ' Esta ação não pode ser desfeita e remove o processo de todas as áreas do sistema.'}
          </DialogContentText>
          {erroExclusao && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {erroExclusao}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPedidoExcluir(null)}
            disabled={deletePedido.isPending}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmarExclusao}
            disabled={deletePedido.isPending}
          >
            {deletePedido.isPending ? 'Excluindo...' : 'Excluir timeline'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
