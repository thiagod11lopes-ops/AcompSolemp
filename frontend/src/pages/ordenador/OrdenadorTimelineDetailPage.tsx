import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Button, Grid, Paper, Typography, Chip } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { OrdenadorInteractiveTimeline } from '@/components/workflow/OrdenadorInteractiveTimeline'
import {
  SetorConclusaoModal,
  type SetorConclusaoVariante,
} from '@/components/ordenador/SetorConclusaoModal'
import { ConfeccaoSolempModal } from '@/components/ordenador/ConfeccaoSolempModal'
import { useAssinarSolemp, useOrdenadorPedido } from '@/hooks/useOrdenadorPedidos'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/utils/format'
import { getRoleLabel, loadAppData } from '@/mocks/seed'
import { PERFIL_PARA_CHAVE_ETAPA } from '@/utils/perfilEtapa'
import { getSolempDefaults } from '@/utils/solemp'

function varianteParaChave(chave: string | null | undefined): SetorConclusaoVariante | null {
  if (chave === 'DIV_MAT_AUDITORIA') return 'auditoria'
  if (chave === 'DIV_MAT_CONTABILIDADE_IMH') return 'contabilidade'
  return null
}

export default function OrdenadorTimelineDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useOrdenadorAuth()
  const { data: pedido, isLoading } = useOrdenadorPedido(id)
  const { data: etapas = [] } = useWorkflowEtapas()
  const assinar = useAssinarSolemp()
  const [modalVariante, setModalVariante] = useState<SetorConclusaoVariante | null>(null)
  const [confeccaoOpen, setConfeccaoOpen] = useState(false)
  const perfilLabel = user ? getRoleLabel(user.perfil) : 'Setor'
  const chavePerfil = user ? PERFIL_PARA_CHAVE_ETAPA[user.perfil] : null
  const etapaPerfil = etapas.find((e) => e.chave === chavePerfil)
  const varianteModal = varianteParaChave(chavePerfil)
  const isConfeccao = chavePerfil === 'DIV_MAT_CONFECCAO_SOLEMP'

  const solempDefaults = useMemo(() => {
    if (!pedido) {
      return { prefix: '65720', sequencial: '', ano: String(new Date().getFullYear()) }
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
    setModalVariante(null)
    setConfeccaoOpen(false)
    navigate('/ordenador/timelines')
  }

  const handleAssinar = () => {
    if (varianteModal) {
      setModalVariante(varianteModal)
      return
    }
    if (isConfeccao) {
      setConfeccaoOpen(true)
      return
    }
    assinar.mutate({ pedidoId: pedido.id }, { onSuccess: concluirComSucesso })
  }

  const handleEnviarComAnotacoes = (anotacoes: string) => {
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

  const modalAberto = Boolean(modalVariante) || confeccaoOpen

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
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Conclua a etapa <strong>{etapaPerfil?.nome ?? perfilLabel}</strong> para avançar o
                processo.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {modalVariante && (
        <SetorConclusaoModal
          open
          variante={modalVariante}
          onClose={() => setModalVariante(null)}
          onEnviar={handleEnviarComAnotacoes}
          loading={assinar.isPending}
          pedidoNumero={pedido.numero}
        />
      )}

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
