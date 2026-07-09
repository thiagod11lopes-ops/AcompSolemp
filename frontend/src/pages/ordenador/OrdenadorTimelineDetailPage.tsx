import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { Box, Button, Grid, Paper, Typography, Chip } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { OrdenadorInteractiveTimeline } from '@/components/workflow/OrdenadorInteractiveTimeline'
import { SetorConclusaoModal } from '@/components/ordenador/SetorConclusaoModal'
import { AuditoriaPlanilhaModal } from '@/components/ordenador/AuditoriaPlanilhaModal'
import { ContabilidadeConfirmacaoModal } from '@/components/ordenador/ContabilidadeConfirmacaoModal'
import { ConfeccaoSolempModal } from '@/components/ordenador/ConfeccaoSolempModal'
import { useAssinarSolemp, useOrdenadorPedido } from '@/hooks/useOrdenadorPedidos'
import { MENSAGENS_ARQUIVAMENTO } from '@/utils/processoArquivamento'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/utils/format'
import { getRoleLabel, loadAppData } from '@/mocks/seed'
import { PERFIL_PARA_CHAVE_ETAPA } from '@/utils/perfilEtapa'
import { getSolempDefaults, parseSolempNumero } from '@/utils/solemp'
import { pedidoPlanilhaEnvioService } from '@/services/pedidoPlanilhaEnvioService'
import { pedidoToConsumoRow } from '@/utils/consumoMaterialTemplate'
import { buildImhPlanilhaFromConsumo } from '@/utils/imhPlanilhaTemplate'
import type { PedidoPlanilhaEnvioState } from '@/types'

export default function OrdenadorTimelineDetailPage() {
  const { id = '' } = useParams()
  const { navigatePortal } = usePortalPaths()
  const { user } = useOrdenadorAuth()
  const { data: pedido, isLoading } = useOrdenadorPedido(id)
  const { data: etapas = [] } = useWorkflowEtapas()
  const assinar = useAssinarSolemp()
  const [auditoriaOpen, setAuditoriaOpen] = useState(false)
  const [planilhaOpen, setPlanilhaOpen] = useState(false)
  const [planilhaRecebida, setPlanilhaRecebida] = useState(false)
  const [planilhaEncaminhadaImh, setPlanilhaEncaminhadaImh] = useState(false)
  const [planilhaRecebidaImh, setPlanilhaRecebidaImh] = useState(false)
  const [contabilidadeOpen, setContabilidadeOpen] = useState(false)
  const [confeccaoOpen, setConfeccaoOpen] = useState(false)
  const [fluxoEncerrado, setFluxoEncerrado] = useState(false)
  const [mensagemFluxoEncerrado, setMensagemFluxoEncerrado] = useState<string | null>(null)
  const perfilLabel = user ? getRoleLabel(user.perfil) : 'Setor'
  const chavePerfil = user ? PERFIL_PARA_CHAVE_ETAPA[user.perfil] : null
  const etapaPerfil = etapas.find((e) => e.chave === chavePerfil)
  const isAuditoria = chavePerfil === 'DIV_MAT_AUDITORIA'
  const isContabilidade = chavePerfil === 'DIV_MAT_CONTABILIDADE_IMH'
  const isConfeccao = chavePerfil === 'DIV_MAT_CONFECCAO_SOLEMP'

  const solempDefaults = useMemo(() => {
    if (!pedido) {
      return { prefix: '65720', sequencial: '', ano: String(new Date().getFullYear()) }
    }
    if (pedido.solemp?.numero) {
      const parsed = parseSolempNumero(pedido.solemp.numero)
      if (parsed) return parsed
    }
    return getSolempDefaults(loadAppData(), pedido.clinicaId)
  }, [pedido])

  const planilhaEnvio = useMemo<PedidoPlanilhaEnvioState | null>(() => {
    if (!pedido) return null
    const stored = pedidoPlanilhaEnvioService.getForPedido(pedido.id)
    if (stored) return stored
    const row = pedidoToConsumoRow(pedido)
    const built = buildImhPlanilhaFromConsumo([row])
    return {
      cabecalho: built.cabecalho,
      linhas: built.linhas,
      enviadoEm: pedido.dataSolicitacao,
    }
  }, [pedido])

  const fluxoDiretoImh = useMemo(() => {
    if (!pedido) return false
    const auditoriaEtapa = etapas.find((e) => e.chave === 'DIV_MAT_AUDITORIA')
    const contabilidadeEtapa = etapas.find((e) => e.chave === 'DIV_MAT_CONTABILIDADE_IMH')
    const temHistoricoAuditoria = auditoriaEtapa
      ? pedido.etapasHistorico.some((h) => h.etapaId === auditoriaEtapa.id)
      : false
    const temHistoricoContabilidade = contabilidadeEtapa
      ? pedido.etapasHistorico.some((h) => h.etapaId === contabilidadeEtapa.id)
      : false
    return temHistoricoContabilidade && !temHistoricoAuditoria
  }, [pedido, etapas])

  useEffect(() => {
    if (!pedido) return
    const stored = pedidoPlanilhaEnvioService.getForPedido(pedido.id)
    const auditoriaEtapa = etapas.find((e) => e.chave === 'DIV_MAT_AUDITORIA')
    const auditoriaConcluida = auditoriaEtapa
      ? Boolean(
          pedido.etapasHistorico.find(
            (h) => h.etapaId === auditoriaEtapa.id && h.dataConclusao,
          ),
        )
      : false

    setPlanilhaRecebida(Boolean(stored?.recebidaEm))
    setPlanilhaEncaminhadaImh(
      Boolean(stored?.encaminhadaImhEm) ||
        (auditoriaConcluida && Boolean(stored)) ||
        (fluxoDiretoImh && Boolean(stored?.enviadoEm)),
    )
    setPlanilhaRecebidaImh(Boolean(stored?.recebidaImhEm))
    setFluxoEncerrado(Boolean(stored?.arquivadaEm))
    if (stored?.arquivadaEm && chavePerfil === 'DIV_MAT_CONTABILIDADE_IMH') {
      setMensagemFluxoEncerrado(MENSAGENS_ARQUIVAMENTO.DIV_MAT_CONTABILIDADE_IMH)
    }
  }, [pedido, etapas, chavePerfil, fluxoDiretoImh])

  if (isLoading) return <LoadingSpinner />

  if (!pedido) {
    return (
      <Box>
        <Typography>Processo não encontrado ou sem pendência para o seu perfil.</Typography>
        <Button onClick={() => navigatePortal('/ordenador/timelines')} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    )
  }

  const concluirComSucesso = () => {
    setAuditoriaOpen(false)
    setContabilidadeOpen(false)
    setConfeccaoOpen(false)
    navigatePortal('/ordenador/arquivados')
  }

  const handleAssinar = () => {
    if (isAuditoria) return
    if (isContabilidade) {
      if (!planilhaRecebidaImh) return
      setContabilidadeOpen(true)
      return
    }
    if (isConfeccao) {
      if (!planilhaRecebida) return
      setConfeccaoOpen(true)
      return
    }
    assinar.mutate({ pedidoId: pedido.id }, { onSuccess: concluirComSucesso })
  }

  const handleEnviarAuditoria = (anotacoes: string) => {
    assinar.mutate(
      { pedidoId: pedido.id, anotacoes },
      {
        onSuccess: () => {
          pedidoPlanilhaEnvioService.markEncaminhadaImh(pedido.id)
          setAuditoriaOpen(false)
          navigatePortal('/ordenador/arquivados')
        },
      },
    )
  }

  const handleReceberPlanilhaImh = () => {
    pedidoPlanilhaEnvioService.markRecebidaImh(pedido.id)
    setPlanilhaRecebidaImh(true)
    setPlanilhaOpen(true)
  }

  const handleReceberPlanilha = () => {
    pedidoPlanilhaEnvioService.markRecebida(pedido.id)
    setPlanilhaRecebida(true)
    setPlanilhaOpen(true)
  }

  const handleEncaminharImh = () => {
    setAuditoriaOpen(true)
  }

  const handleConfirmarContabilidade = (anotacoes: string) => {
    assinar.mutate(
      { pedidoId: pedido.id, anotacoes },
      {
        onSuccess: () => {
          setContabilidadeOpen(false)
          navigatePortal('/ordenador/arquivados')
        },
      },
    )
  }

  const handleEnviarConfeccao = ({ numero, valor }: { numero: string; valor: number }) => {
    assinar.mutate(
      { pedidoId: pedido.id, solempNumero: numero, solempValor: valor },
      { onSuccess: concluirComSucesso },
    )
  }

  const modalAberto =
    auditoriaOpen || planilhaOpen || contabilidadeOpen || confeccaoOpen

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigatePortal('/ordenador/timelines')}
        sx={{ mb: 2 }}
      >
        Voltar às timelines
      </Button>

      <PageHeader
        title={`${perfilLabel} — ${pedido.numero}`}
        titleVariant="h6"
        subtitle={`${pedido.clinica.nome} · ${pedido.empresa.nomeFantasia}`}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <OrdenadorInteractiveTimeline
            pedido={pedido}
            etapas={etapas}
            onAssinar={handleAssinar}
            assinando={assinar.isPending && !modalAberto}
            onReceberPlanilha={isAuditoria || isConfeccao ? handleReceberPlanilha : undefined}
            onEncaminharImh={isAuditoria ? handleEncaminharImh : undefined}
            planilhaRecebida={planilhaRecebida}
            onReceberPlanilhaImh={isContabilidade ? handleReceberPlanilhaImh : undefined}
            planilhaEncaminhadaImh={planilhaEncaminhadaImh}
            planilhaRecebidaImh={planilhaRecebidaImh}
            fluxoDiretoImh={fluxoDiretoImh}
            fluxoEncerrado={fluxoEncerrado}
            mensagemFluxoEncerrado={mensagemFluxoEncerrado}
          />
          {fluxoEncerrado && (
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
              onClick={() => navigatePortal('/ordenador/arquivados')}
            >
              Ver arquivados
            </Button>
          )}
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Dados do Processo
            </Typography>
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography variant="body2">
                <strong>Clínica:</strong> {pedido.clinica.nome}
              </Typography>
              <Typography variant="body2">
                <strong>Material:</strong> {pedido.material.descricao}
              </Typography>
              <Typography variant="body2">
                <strong>Valor:</strong> {formatCurrency(pedido.valor)}
              </Typography>
              <Typography variant="body2">
                <strong>Solicitação:</strong> {formatDate(pedido.dataSolicitacao)}
              </Typography>
              <Chip
                label={etapaPerfil?.nome ?? pedido.etapaAtual.nome}
                color="warning"
                size="small"
                sx={{ width: 'fit-content', mt: 1 }}
              />
            </Box>
          </Paper>

          {pedido.solemp && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                SOLEMP
              </Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 800 }}>
                {pedido.solemp.numero}
              </Typography>
              {pedido.solemp.valor != null && (
                <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                  {formatCurrency(pedido.solemp.valor)}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Conclua a etapa <strong>{etapaPerfil?.nome ?? perfilLabel}</strong> para avançar o
                processo.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      <AuditoriaPlanilhaModal
        open={planilhaOpen}
        pedidoNumero={pedido.numero}
        planilha={planilhaEnvio}
        title={
          isContabilidade
            ? `Contabilidade/IMH — Planilha ${pedido.numero}`
            : isConfeccao
              ? `Confecção de Solemp — Planilha ${pedido.numero}`
              : undefined
        }
        onClose={() => setPlanilhaOpen(false)}
      />

      <SetorConclusaoModal
        open={auditoriaOpen}
        variante="auditoria"
        onClose={() => setAuditoriaOpen(false)}
        onEnviar={handleEnviarAuditoria}
        loading={assinar.isPending}
        pedidoNumero={pedido.numero}
      />

      <ContabilidadeConfirmacaoModal
        open={contabilidadeOpen}
        onClose={() => setContabilidadeOpen(false)}
        onConfirmar={handleConfirmarContabilidade}
        loading={assinar.isPending}
        pedido={pedido}
      />

      <ConfeccaoSolempModal
        open={confeccaoOpen}
        onClose={() => setConfeccaoOpen(false)}
        onEnviar={handleEnviarConfeccao}
        loading={assinar.isPending}
        pedidoNumero={pedido.numero}
        defaults={solempDefaults}
        valorSugerido={pedido.valor}
      />
    </>
  )
}
