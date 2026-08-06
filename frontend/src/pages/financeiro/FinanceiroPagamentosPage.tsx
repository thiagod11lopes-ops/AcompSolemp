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
import PaymentsIcon from '@mui/icons-material/Payments'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useFinanceiroPedidos } from '@/hooks/useFinanceiroPedidos'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { formatCurrency, formatDate } from '@/utils/format'
import { resolveEmpenhoExibicao } from '@/utils/empenho'
import { pedidoEtapaConcluidaParaChave } from '@/utils/perfilEtapa'
import {
  contarTimelineList,
  passaFiltroTimelineList,
  type TimelineListFiltro,
} from '@/utils/timelineListFilter'
import type { PedidoComDetalhes } from '@/types'

export default function FinanceiroPagamentosPage() {
  const { navigatePortal } = usePortalPaths()
  const { data: pedidos = [], isLoading } = useFinanceiroPedidos()
  const { data: etapas = [] } = useWorkflowEtapas()
  const [filtro, setFiltro] = useState<TimelineListFiltro>('EM_ANDAMENTO')

  const isConcluidoFinanceiro = useMemo(
    () => (pedido: PedidoComDetalhes) =>
      pedidoEtapaConcluidaParaChave(pedido, etapas, 'DIV_MAT_FINANCAS'),
    [etapas],
  )

  const contagens = useMemo(
    () => contarTimelineList(pedidos, { concluido: isConcluidoFinanceiro }),
    [pedidos, isConcluidoFinanceiro],
  )
  const filtrados = useMemo(
    () =>
      pedidos.filter((p) =>
        passaFiltroTimelineList(p, filtro, { concluido: isConcluidoFinanceiro }),
      ),
    [pedidos, filtro, isConcluidoFinanceiro],
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Timelines — Solemp confeccionada"
        subtitle="Processos em Solemp confeccionada — em andamento, todas ou concluídas"
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
          <PaymentsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {pedidos.length === 0
              ? 'Nenhum processo de Solemp confeccionada no momento.'
              : 'Nenhuma timeline encontrada com o filtro atual.'}
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtrados.map((pedido) => {
            const concluido = isConcluidoFinanceiro(pedido)
            const empenhoLabel = resolveEmpenhoExibicao({
              etiquetas: pedido.dadosClinica?.etiquetas,
            })
            return (
              <Grid key={pedido.id} size={{ xs: 12, md: 6 }}>
                <Card
                  variant="outlined"
                  sx={{
                    borderLeft: 4,
                    borderColor: concluido ? 'success.main' : 'info.main',
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
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
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
                            ? 'Solemp confeccionada — concluído'
                            : 'Solemp confeccionada — pendente'
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
