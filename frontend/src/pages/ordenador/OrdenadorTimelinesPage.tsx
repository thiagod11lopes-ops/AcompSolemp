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
  Typography,
} from '@mui/material'
import TimelineIcon from '@mui/icons-material/Timeline'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { TimelineListToolbar } from '@/components/common/TimelineListToolbar'
import { useOrdenadorPedidos } from '@/hooks/useOrdenadorPedidos'
import { useProcessosArquivadosSetor } from '@/hooks/useProcessosArquivados'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { formatCurrency, formatDate } from '@/utils/format'
import { resolveEmpenhoExibicao } from '@/utils/empenho'
import { getRoleLabel } from '@/mocks/seed'
import {
  chavesEtapaParaPerfil,
  pedidoEtapaConcluidaParaChave,
  pedidoPendenteParaChave,
  pedidoPendenteParaPerfil,
  pedidoRelacionadoParaChave,
} from '@/utils/perfilEtapa'
import {
  clinicasFromPedidos,
  contarTimelineList,
  filtrarTimelineList,
  type TimelineListExtraFilters,
  type TimelineListFiltro,
} from '@/utils/timelineListFilter'
import type { PedidoComDetalhes } from '@/types'
import { userTemCadeiaSolemp } from '@/utils/userPerfis'
import { etapasNavPermitidas } from '@/utils/setorNav'
import { loginPerfilLabel } from '@/utils/loginPerfis'

const ETAPA_LABEL: Record<string, string> = {
  DIV_MAT_AUDITORIA: 'Auditoria',
  DIV_MAT_CONTABILIDADE_IMH: 'IMH',
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
  const [filtro, setFiltro] = useState<TimelineListFiltro>('MINHAS_PENDENCIAS')
  const [extras, setExtras] = useState<TimelineListExtraFilters>({})
  const perfilLabel = user ? getRoleLabel(user.perfil) : 'Setor'
  const isCadeia = Boolean(user && userTemCadeiaSolemp(user))
  const chavesPerfil = user ? chavesEtapaParaPerfil(user.perfil, user) : []
  const etapasPermitidas = user ? etapasNavPermitidas(user) : []
  const etapaFiltro = searchParams.get('etapa')
  const etapaChaveValida =
    etapaFiltro && etapasPermitidas.includes(etapaFiltro) ? etapaFiltro : null
  const tituloEtapa = etapaChaveValida
    ? (ETAPA_LABEL[etapaChaveValida] ?? loginPerfilLabel(user!.perfil) ?? perfilLabel)
    : user && etapasPermitidas.length > 1
      ? 'Meus setores'
      : perfilLabel
  const chavesArquivo = etapaChaveValida
    ? [etapaChaveValida]
    : etapasPermitidas.length > 0
      ? etapasPermitidas
      : chavesPerfil
  const { data: processosArquivados = [] } = useProcessosArquivadosSetor(chavesArquivo)

  const isConcluidoSetor = useMemo(() => {
    return (pedido: PedidoComDetalhes) => {
      if (!user) return pedido.concluido
      if (etapaChaveValida) {
        return pedidoEtapaConcluidaParaChave(
          pedido,
          etapas,
          etapaChaveValida,
          processosArquivados,
        )
      }
      if (isCadeia) {
        return pedidoEtapaConcluidaParaChave(
          pedido,
          etapas,
          'DIV_MAT_EMPENHADO',
          processosArquivados,
        )
      }
      const chave = chavesPerfil[0]
      if (!chave) return pedido.concluido
      return pedidoEtapaConcluidaParaChave(pedido, etapas, chave, processosArquivados)
    }
  }, [user, etapas, etapaChaveValida, isCadeia, chavesPerfil, processosArquivados])

  const isPendenteSetor = useMemo(() => {
    return (pedido: PedidoComDetalhes) => {
      if (!user) return false
      if (etapaChaveValida) {
        return pedidoPendenteParaChave(pedido, etapas, etapaChaveValida, processosArquivados)
      }
      if (etapasPermitidas.length > 1) {
        return etapasPermitidas.some((chave) =>
          pedidoPendenteParaChave(pedido, etapas, chave, processosArquivados),
        )
      }
      return pedidoPendenteParaPerfil(
        pedido,
        etapas,
        user.perfil,
        processosArquivados,
        user,
      )
    }
  }, [user, etapas, etapaChaveValida, etapasPermitidas, processosArquivados])

  const pedidosEscopo = useMemo(() => {
    if (etapaChaveValida) {
      return pedidos.filter((p) =>
        pedidoRelacionadoParaChave(p, etapas, etapaChaveValida, processosArquivados),
      )
    }
    if (etapasPermitidas.length > 1) {
      return pedidos.filter((p) =>
        etapasPermitidas.some((chave) =>
          pedidoRelacionadoParaChave(p, etapas, chave, processosArquivados),
        ),
      )
    }
    return pedidos
  }, [pedidos, etapas, etapaChaveValida, etapasPermitidas, processosArquivados])

  const clinicas = useMemo(() => clinicasFromPedidos(pedidosEscopo), [pedidosEscopo])

  const filterOpts = useMemo(
    () => ({ concluido: isConcluidoSetor, pendente: isPendenteSetor }),
    [isConcluidoSetor, isPendenteSetor],
  )

  const contagens = useMemo(
    () => contarTimelineList(pedidosEscopo, filterOpts, extras),
    [pedidosEscopo, filterOpts, extras],
  )
  const filtrados = useMemo(
    () => filtrarTimelineList(pedidosEscopo, filtro, filterOpts, extras),
    [pedidosEscopo, filtro, filterOpts, extras],
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title={`Timelines — ${tituloEtapa}`}
        subtitle={
          isCadeia
            ? 'Fila do setor: pendências, atrasos e filtros por clínica/data'
            : 'Fila do setor — minhas pendências, atrasadas e filtros'
        }
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
            const pendente = isPendenteSetor(pedido)
            const atrasado = !concluidoSetor && pedido.prazoStatus === 'ATRASADO'
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
                      : atrasado
                        ? 'error.main'
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
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {pendente && !concluidoSetor && (
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
