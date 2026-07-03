import { useNavigate, useParams } from 'react-router-dom'
import { Box, Button, Grid, Paper, Typography, Chip } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { OrdenadorInteractiveTimeline } from '@/components/workflow/OrdenadorInteractiveTimeline'
import { useAssinarSolemp, useOrdenadorPedido } from '@/hooks/useOrdenadorPedidos'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { formatCurrency, formatDate } from '@/utils/format'

export default function OrdenadorTimelineDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: pedido, isLoading } = useOrdenadorPedido(id)
  const { data: etapas = [] } = useWorkflowEtapas()
  const assinar = useAssinarSolemp()

  if (isLoading) return <LoadingSpinner />

  if (!pedido) {
    return (
      <Box>
        <Typography>Processo não encontrado ou já assinado.</Typography>
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
        title={`Assinar SOLEMP — ${pedido.numero}`}
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
                label={pedido.etapaAtual.nome}
                color="warning"
                size="small"
                sx={{ width: 'fit-content', mt: 1 }}
              />
            </Box>
          </Paper>

          {pedido.solemp && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                SOLEMP a assinar
              </Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 800 }}>
                {pedido.solemp.numero}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Ao assinar, os estágios <strong>Aguardando assinatura</strong> e{' '}
                <strong>SOLEMP assinada</strong> serão concluídos automaticamente.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </>
  )
}
