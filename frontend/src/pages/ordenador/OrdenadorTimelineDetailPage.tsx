import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Button, Grid, Paper, Typography, Chip } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { OrdenadorInteractiveTimeline } from '@/components/workflow/OrdenadorInteractiveTimeline'
import { SetorConclusaoModal } from '@/components/ordenador/SetorConclusaoModal'
import { ContabilidadeConfirmacaoModal } from '@/components/ordenador/ContabilidadeConfirmacaoModal'
import { ConfeccaoSolempModal } from '@/components/ordenador/ConfeccaoSolempModal'
import { Assinatura1SolempModal } from '@/components/ordenador/Assinatura1SolempModal'
import { useAssinarSolemp, useOrdenadorPedido } from '@/hooks/useOrdenadorPedidos'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/utils/format'
import { getRoleLabel, loadAppData } from '@/mocks/seed'
import { PERFIL_PARA_CHAVE_ETAPA } from '@/utils/perfilEtapa'
import { getSolempDefaults, parseSolempNumero } from '@/utils/solemp'

export default function OrdenadorTimelineDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useOrdenadorAuth()
  const { data: pedido, isLoading } = useOrdenadorPedido(id)
  const { data: etapas = [] } = useWorkflowEtapas()
  const assinar = useAssinarSolemp()
  const [auditoriaOpen, setAuditoriaOpen] = useState(false)
  const [contabilidadeOpen, setContabilidadeOpen] = useState(false)
  const [confeccaoOpen, setConfeccaoOpen] = useState(false)
  const [assinatura1Open, setAssinatura1Open] = useState(false)
  const perfilLabel = user ? getRoleLabel(user.perfil) : 'Setor'
  const chavePerfil = user ? PERFIL_PARA_CHAVE_ETAPA[user.perfil] : null
  const etapaPerfil = etapas.find((e) => e.chave === chavePerfil)
  const isAuditoria = chavePerfil === 'DIV_MAT_AUDITORIA'
  const isContabilidade = chavePerfil === 'DIV_MAT_CONTABILIDADE_IMH'
  const isConfeccao = chavePerfil === 'DIV_MAT_CONFECCAO_SOLEMP'
  const isAssinatura1 = chavePerfil === 'DIV_MAT_ASSINATURA_1'

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

  if (isLoading) return <LoadingSpinner />

  if (!pedido) {
    return (
      <Box>
        <Typography>Processo não encontrado ou sem pendência para o seu perfil.</Typography>
        <Button onClick={() => navigate('/ordenador/timelines')} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    )
  }

  const concluirComSucesso = () => {
    setAuditoriaOpen(false)
    setContabilidadeOpen(false)
    setConfeccaoOpen(false)
    setAssinatura1Open(false)
    navigate('/ordenador/timelines')
  }

  const handleAssinar = () => {
    if (isAuditoria) {
      setAuditoriaOpen(true)
      return
    }
    if (isContabilidade) {
      setContabilidadeOpen(true)
      return
    }
    if (isConfeccao) {
      setConfeccaoOpen(true)
      return
    }
    if (isAssinatura1) {
      setAssinatura1Open(true)
      return
    }
    assinar.mutate({ pedidoId: pedido.id }, { onSuccess: concluirComSucesso })
  }

  const handleEnviarAuditoria = (anotacoes: string) => {
    assinar.mutate(
      { pedidoId: pedido.id, anotacoes },
      { onSuccess: concluirComSucesso },
    )
  }

  const handleConfirmarContabilidade = (anotacoes: string) => {
    assinar.mutate(
      { pedidoId: pedido.id, anotacoes },
      { onSuccess: concluirComSucesso },
    )
  }

  const handleEnviarConfeccao = ({ numero, valor }: { numero: string; valor: number }) => {
    assinar.mutate(
      { pedidoId: pedido.id, solempNumero: numero, solempValor: valor },
      { onSuccess: concluirComSucesso },
    )
  }

  const handleEnviarAssinatura1 = ({
    numero,
    valor,
    assinanteNome,
  }: {
    numero: string
    valor: number
    assinanteNome: string
  }) => {
    assinar.mutate(
      {
        pedidoId: pedido.id,
        solempNumero: numero,
        solempValor: valor,
        assinanteNome,
      },
      { onSuccess: concluirComSucesso },
    )
  }

  const modalAberto =
    auditoriaOpen || contabilidadeOpen || confeccaoOpen || assinatura1Open

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/ordenador/timelines')}
        sx={{ mb: 2 }}
      >
        Voltar às timelines
      </Button>

      <PageHeader
        title={`${perfilLabel} — ${pedido.numero}`}
        subtitle={`${pedido.clinica.nome} · ${pedido.empresa.nomeFantasia}`}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <OrdenadorInteractiveTimeline
            pedido={pedido}
            etapas={etapas}
            onAssinar={handleAssinar}
            assinando={assinar.isPending && !modalAberto}
          />
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
              {pedido.solemp.assinatura1Nome && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Assinatura 1:</strong> {pedido.solemp.assinatura1Nome}
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

      <Assinatura1SolempModal
        open={assinatura1Open}
        onClose={() => setAssinatura1Open(false)}
        onEnviar={handleEnviarAssinatura1}
        loading={assinar.isPending}
        pedidoNumero={pedido.numero}
        defaults={solempDefaults}
        valorSugerido={pedido.solemp?.valor ?? pedido.valor}
        assinanteSugerido={user?.nome ?? ''}
      />
    </>
  )
}
