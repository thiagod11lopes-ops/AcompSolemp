import { useMemo, useState } from 'react'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Typography,
} from '@mui/material'
import PaymentsIcon from '@mui/icons-material/Payments'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { TimelineListToolbar } from '@/components/common/TimelineListToolbar'
import { useFinanceiroPedidos } from '@/hooks/useFinanceiroPedidos'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { formatCurrency, formatDate } from '@/utils/format'
import { resolveEmpenhoExibicao } from '@/utils/empenho'
import {
  pedidoEtapaConcluidaParaChave,
  pedidoPendenteParaChave,
} from '@/utils/perfilEtapa'
import {
  clinicasFromPedidos,
  contarTimelineList,
  filtrarTimelineList,
  type TimelineListExtraFilters,
  type TimelineListFiltro,
} from '@/utils/timelineListFilter'
import type { PedidoComDetalhes } from '@/types'

export default function FinanceiroPagamentosPage() {
  const { navigatePortal } = usePortalPaths()
  const { data: pedidos = [], isLoading } = useFinanceiroPedidos()
  const { data: etapas = [] } = useWorkflowEtapas()
  const [filtro, setFiltro] = useState<TimelineListFiltro>('MINHAS_PENDENCIAS')
  const [extras, setExtras] = useState<TimelineListExtraFilters>({})

  const isConcluidoFinanceiro = useMemo(
    () => (pedido: PedidoComDetalhes) =>
      pedidoEtapaConcluidaParaChave(pedido, etapas, 'DIV_MAT_FINANCAS'),
    [etapas],
  )

  const isPendenteFinanceiro = useMemo(
    () => (pedido: PedidoComDetalhes) =>
      pedidoPendenteParaChave(pedido, etapas, 'DIV_MAT_FINANCAS'),
    [etapas],
  )

  const clinicas = useMemo(() => clinicasFromPedidos(pedidos), [pedidos])

  const filterOpts = useMemo(
    () => ({ concluido: isConcluidoFinanceiro, pendente: isPendenteFinanceiro }),
    [isConcluidoFinanceiro, isPendenteFinanceiro],
  )

  const contagens = useMemo(
    () => contarTimelineList(pedidos, filterOpts, extras),
    [pedidos, filterOpts, extras],
  )
  const filtrados = useMemo(
    () => filtrarTimelineList(pedidos, filtro, filterOpts, extras),
    [pedidos, filtro, filterOpts, extras],
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Timelines — Solemp em Rascunho"
        subtitle="Fila financeira: minhas pendências, atrasadas e filtros por clínica/data"
      />

      <TimelineListToolbar
        filtro={filtro}
        onFiltroChange={setFiltro}
        contagens={contagens}
        extras={extras}
        onExtrasChange={setExtras}
        clinicas={clinicas}
      />

      {filtrados.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <PaymentsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {pedidos.length === 0
              ? 'Nenhum processo de Solemp em Rascunho no momento.'
              : 'Nenhuma timeline encontrada com o filtro atual.'}
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtrados.map((pedido) => {
            const concluido = isConcluidoFinanceiro(pedido)
            const pendente = isPendenteFinanceiro(pedido)
            const atrasado = !concluido && pedido.prazoStatus === 'ATRASADO'
            const empenhoLabel = resolveEmpenhoExibicao({
              etiquetas: pedido.dadosClinica?.etiquetas,
            })
            return (
              <Grid key={pedido.id} size={{ xs: 12, md: 6 }}>
                <Card
                  variant="outlined"
                  sx={{
                    borderLeft: 4,
                    borderColor: concluido
                      ? 'success.main'
                      : atrasado
                        ? 'error.main'
                        : pendente
                          ? 'warning.main'
                          : 'info.main',
                    opacity: concluido ? 0.85 : 1,
                  }}
                >
                  <CardActionArea
                    onClick={() => navigatePortal(`/financeiro/pagamentos/${pedido.id}`)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {pedido.numero}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {pendente && !concluido && (
                            <Chip label="Pendente" color="warning" size="small" />
                          )}
                          {atrasado && (
                            <Chip
                              label={
                                pedido.diasRestantes < 0
                                  ? `Atrasado ${Math.abs(pedido.diasRestantes)}d`
                                  : 'Atrasado'
                              }
                              color="error"
                              size="small"
                            />
                          )}
                          {concluido && (
                            <Chip label="Concluída" color="success" size="small" />
                          )}
                          {empenhoLabel ? (
                            <Chip label={empenhoLabel} color="secondary" size="small" />
                          ) : null}
                          {pedido.solemp && (
                            <Chip label={pedido.solemp.numero} color="primary" size="small" />
                          )}
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {pedido.clinica.nome} · {pedido.material.descricao}
                      </Typography>
                      <Chip
                        label={
                          concluido
                            ? 'Solemp em Rascunho — concluído'
                            : 'Solemp em Rascunho — pendente'
                        }
                        color={concluido ? 'success' : 'info'}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={formatCurrency(pedido.solemp?.valor ?? pedido.valor)}
                          size="small"
                          variant="outlined"
                        />
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
