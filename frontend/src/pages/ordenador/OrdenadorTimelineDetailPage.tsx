import { useNavigate, useParams } from 'react-router-dom'
import { Box, Button, Grid, Paper, Typography, Chip } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { OrdenadorInteractiveTimeline } from '@/components/workflow/OrdenadorInteractiveTimeline'
import { useAssinarSolemp, useOrdenadorPedido } from '@/hooks/useOrdenadorPedidos'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/utils/format'
import { getRoleLabel } from '@/mocks/seed'
import { PERFIL_PARA_CHAVE_ETAPA } from '@/utils/perfilEtapa'

export default function OrdenadorTimelineDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useOrdenadorAuth()
  const { data: pedido, isLoading } = useOrdenadorPedido(id)
  const { data: etapas = [] } = useWorkflowEtapas()
  const assinar = useAssinarSolemp()
  const perfilLabel = user ? getRoleLabel(user.perfil) : 'Setor'
  const chavePerfil = user ? PERFIL_PARA_CHAVE_ETAPA[user.perfil] : null
  const etapaPerfil = etapas.find((e) => e.chave === chavePerfil)

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

  const handleAssinar = () => {
    assinar.mutate(pedido.id, {
      onSuccess: () => navigate('/ordenador/timelines'),
    })
  }

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
            assinando={assinar.isPending}
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
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Conclua a etapa <strong>{etapaPerfil?.nome ?? perfilLabel}</strong> para avançar o
                processo.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </>
  )
}
