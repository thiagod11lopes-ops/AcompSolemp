import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { resolveEmpenhoExibicao } from '@/utils/empenho'
import { getRoleLabel } from '@/mocks/seed'
import {
  CHAVES_CONFECCAO_CADEIA,
  chavesEtapaParaPerfil,
  pedidoEtapaConcluidaParaChave,
  pedidoPendenteParaChave,
  pedidoPendenteParaPerfil,
  pedidoRelacionadoParaChave,
} from '@/utils/perfilEtapa'
import {
  contarTimelineList,
  passaFiltroTimelineList,
  type TimelineListFiltro,
} from '@/utils/timelineListFilter'
import type { PedidoComDetalhes } from '@/types'

const ETAPA_LABEL: Record<string, string> = {
  DIV_MAT_CONFECCAO_SOLEMP: 'Confecção de Solemp',
  DIV_MAT_FINANCAS: 'Solemp em Rascunho',
  DIV_MAT_EMPENHADO: 'Empenhado',
}

export default function OrdenadorTimelinesPage() {
  const { navigatePortal } = usePortalPaths()
  const { user } = useOrdenadorAuth()
  const [searchParams] = useSearchParams()
  const { data: pedidos = [], isLoading } = useOrdenadorPedidos()
  const { data: etapas = [] } = useWorkflowEtapas()
  const [filtro, setFiltro] = useState<TimelineListFiltro>('EM_ANDAMENTO')
  const perfilLabel = user ? getRoleLabel(user.perfil) : 'Setor'
  const isConfeccao = user?.perfil === 'CONFECCAO_SOLEMP'
  const chavesPerfil = user ? chavesEtapaParaPerfil(user.perfil) : []
  const etapaFiltro = searchParams.get('etapa')
  const etapaChaveValida =
    etapaFiltro &&
    (CHAVES_CONFECCAO_CADEIA as readonly string[]).includes(etapaFiltro) &&
    isConfeccao
      ? etapaFiltro
      : null
  const tituloEtapa = etapaChaveValida
    ? (ETAPA_LABEL[etapaChaveValida] ?? perfilLabel)
    : perfilLabel

  const isConcluidoSetor = useMemo(() => {
    return (pedido: PedidoComDetalhes) => {
      if (!user) return pedido.concluido
      if (etapaChaveValida) {
        return pedidoEtapaConcluidaParaChave(pedido, etapas, etapaChaveValida)
      }
      if (isConfeccao) {
        return pedidoEtapaConcluidaParaChave(pedido, etapas, 'DIV_MAT_EMPENHADO')
      }
      const chave = chavesPerfil[0]
      if (!chave) return pedido.concluido
      return pedidoEtapaConcluidaParaChave(pedido, etapas, chave)
    }
  }, [user, isConfeccao, chavesPerfil, etapas, etapaChaveValida])

  const pedidosEscopo = useMemo(() => {
    if (!etapaChaveValida) return pedidos
    return pedidos.filter((p) =>
      pedidoRelacionadoParaChave(p, etapas, etapaChaveValida),
    )
  }, [pedidos, etapas, etapaChaveValida])

  const contagens = useMemo(
    () => contarTimelineList(pedidosEscopo, { concluido: isConcluidoSetor }),
    [pedidosEscopo, isConcluidoSetor],
  )
  const filtrados = useMemo(
    () =>
      pedidosEscopo.filter((p) =>
        passaFiltroTimelineList(p, filtro, { concluido: isConcluidoSetor }),
      ),
    [pedidosEscopo, filtro, isConcluidoSetor],
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title={`Timelines — ${tituloEtapa}`}
        subtitle={
          isConfeccao
            ? 'Confecção, Solemp em Rascunho e Empenhado — receber e enviar planilhas'
            : 'Processos com etapa do seu perfil — em andamento, todas ou concluídas'
        }
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
            {pedidosEscopo.length === 0
              ? `Nenhum processo para ${tituloEtapa} no momento.`
              : 'Nenhuma timeline encontrada com o filtro atual.'}
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtrados.map((pedido) => {
            const concluidoSetor = isConcluidoSetor(pedido)
            const pendente = user
              ? etapaChaveValida
                ? pedidoPendenteParaChave(pedido, etapas, etapaChaveValida)
                : pedidoPendenteParaPerfil(pedido, etapas, user.perfil)
              : false
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
                        {` (${tituloEtapa})`}
                      </Typography>
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
                        {pedido.clinica.tipo === 'empenhado' &&
                          resolveEmpenhoExibicao({ etiquetas: pedido.dadosClinica?.etiquetas }) && (
                            <Chip
                              label={
                                resolveEmpenhoExibicao({
                                  etiquetas: pedido.dadosClinica?.etiquetas,
                                })!
                              }
                              size="small"
                              color="secondary"
                            />
                          )}
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
