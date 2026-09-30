import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Paper,
  Typography,
  Button,
  Chip,
  Box,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { StatusChip } from '@/components/common/StatusChip'
import { ClinicaInteractiveTimeline } from '@/components/workflow/ClinicaInteractiveTimeline'
import { useDemoPedido, usePedido } from '@/hooks/usePedidos'
import { useDemoWorkflowEtapas, useWorkflowEtapas } from '@/hooks/useCadastros'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { resolveEtapaNomeExibicao } from '@/utils/timelineFlow'
import { formatCurrency } from '@/utils/format'

export default function GestorTimelineDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isDemo, navigatePortal } = usePortalPaths()
  const fonteDemo = isDemo || searchParams.get('fonte') === 'demo'
  const { data: pedidoOrg, isLoading: loadingOrg } = usePedido(id)
  const { data: pedidoDemo, isLoading: loadingDemo } = useDemoPedido(id)
  const pedido = fonteDemo ? pedidoDemo : pedidoOrg
  const isLoading = fonteDemo ? loadingDemo : loadingOrg
  const { data: etapasOrg = [] } = useWorkflowEtapas()
  const { data: etapasDemo = [] } = useDemoWorkflowEtapas()
  const etapas = fonteDemo ? etapasDemo : etapasOrg

  const voltar = () => {
    if (isDemo) {
      navigatePortal('/gestor/timeline')
      return
    }
    if (fonteDemo) {
      navigate('/gestor/timeline', { state: { fonte: 'demonstracao' } })
      return
    }
    navigate('/gestor/timeline')
  }

  if (isLoading) return <LoadingSpinner />
  if (!pedido) {
    return (
      <Box>
        <Typography>Timeline não encontrada.</Typography>
        <Button onClick={voltar} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    )
  }

  const etapasAtivas = pedido.etapasAtivasIds?.length
    ? etapas.filter((e) => pedido.etapasAtivasIds.includes(e.id))
    : [pedido.etapaAtual]

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={voltar}
        sx={{ mb: 2 }}
      >
        Voltar às timelines
      </Button>

      <PageHeader
        title={`Timeline — ${pedido.numero}`}
        titleVariant="h6"
        subtitle={`${pedido.clinica.nome} · ${pedido.empresa.nomeFantasia}`}
        action={<StatusChip status={pedido.prazoStatus} concluido={pedido.concluido} />}
      />

      <Paper
        elevation={0}
        sx={{
          mb: 2,
          px: 2,
          py: 1.5,
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.25,
          alignItems: 'center',
        }}
      >
        {etapasAtivas.map((etapa) => (
          <Chip
            key={etapa.id}
            label={resolveEtapaNomeExibicao(etapa, pedido)}
            color="primary"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        ))}
        <Typography variant="body2" color="text.secondary">
          {pedido.material.descricao}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {formatCurrency(pedido.valor)}
        </Typography>
      </Paper>

      <Box sx={{ mb: 3 }}>
        <ClinicaInteractiveTimeline pedido={pedido} etapas={etapas} somenteLeitura />
      </Box>
    </>
  )
}
