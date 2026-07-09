import { useMemo, useState } from 'react'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import TimelineIcon from '@mui/icons-material/Timeline'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useOrdenadorPedidos } from '@/hooks/useOrdenadorPedidos'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { formatCurrency, formatDate } from '@/utils/format'
import { getRoleLabel } from '@/mocks/seed'
import {
  PERFIL_PARA_CHAVE_ETAPA,
  pedidoEtapaConcluidaParaChave,
  pedidoPendenteParaChave,
} from '@/utils/perfilEtapa'
import {
  contarTimelineList,
  passaFiltroTimelineList,
  type TimelineListFiltro,
} from '@/utils/timelineListFilter'
import type { PedidoComDetalhes } from '@/types'

export default function OrdenadorTimelinesPage() {
  const { navigatePortal } = usePortalPaths()
  const { user } = useOrdenadorAuth()
  const { data: pedidos = [], isLoading } = useOrdenadorPedidos()
  const { data: etapas = [] } = useWorkflowEtapas()
  const [filtro, setFiltro] = useState<TimelineListFiltro>('EM_ANDAMENTO')
  const perfilLabel = user ? getRoleLabel(user.perfil) : 'Setor'
  const etapaChave = user ? PERFIL_PARA_CHAVE_ETAPA[user.perfil] : null

  const isConcluidoSetor = useMemo(() => {
    return (pedido: PedidoComDetalhes) => {
      if (!etapaChave) return pedido.concluido
      return pedidoEtapaConcluidaParaChave(pedido, etapas, etapaChave)
    }
  }, [etapaChave, etapas])

  const contagens = useMemo(
    () => contarTimelineList(pedidos, { concluido: isConcluidoSetor }),
    [pedidos, isConcluidoSetor],
  )
  const filtrados = useMemo(
    () =>
      pedidos.filter((p) =>
        passaFiltroTimelineList(p, filtro, { concluido: isConcluidoSetor }),
      ),
    [pedidos, filtro, isConcluidoSetor],
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title={`Timelines — ${perfilLabel}`}
        subtitle="Processos com etapa do seu perfil — em andamento, todas ou concluídas"
      />

      <Tabs
        value={filtro}
        onChange={(_, value: TimelineListFiltro) => setFiltro(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        <Tab value="EM_ANDAMENTO" label={`Em andamento (${contagens.emAndamento})`} />
        <Tab value="TODAS" label={`Todas (${contagens.todas})`} />
        <Tab value="CONCLUIDAS" label={`Concluídas (${contagens.concluidas})`} />
      </Tabs>

      {filtrados.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <TimelineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {pedidos.length === 0
              ? `Nenhum processo para ${perfilLabel} no momento.`
              : 'Nenhuma timeline encontrada com o filtro atual.'}
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtrados.map((pedido) => {
            const concluidoSetor = isConcluidoSetor(pedido)
            const pendente =
              Boolean(etapaChave) &&
              pedidoPendenteParaChave(pedido, etapas, etapaChave!)
            const etapaAtiva = pedido.etapasHistorico.find(
              (h) =>
                (pedido.etapasAtivasIds ?? [pedido.etapaAtualId]).includes(h.etapaId) &&
                !h.dataConclusao,
            )
            return (
              <Grid key={pedido.id} size={{ xs: 12, md: 6 }}>
                <Card
                  variant="outlined"
                  sx={{
                    borderLeft: 4,
                    borderColor: concluidoSetor
                      ? 'success.main'
                      : pendente
                        ? 'warning.main'
                        : 'divider',
                    opacity: concluidoSetor ? 0.85 : 1,
                  }}
                >
                  <CardActionArea
                    onClick={() => navigatePortal(`/ordenador/timelines/${pedido.id}`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {pedido.numero}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          {concluidoSetor && (
                            <Chip label="Concluída" color="success" size="small" />
                          )}
                          {pedido.solemp && (
                            <Chip label={pedido.solemp.numero} color="primary" size="small" />
                          )}
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {pedido.clinica.nome} · {pedido.material.descricao}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Etapa:</strong>{' '}
                        {etapaAtiva?.etapaNome ?? pedido.etapaAtual.nome}
                        {etapaChave ? ` (${perfilLabel})` : ''}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={formatCurrency(pedido.valor)} size="small" variant="outlined" />
                        <Chip
                          label={`Solicitação: ${formatDate(pedido.dataSolicitacao)}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}
    </>
  )
}
