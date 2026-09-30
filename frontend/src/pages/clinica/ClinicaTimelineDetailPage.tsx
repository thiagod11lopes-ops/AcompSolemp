import { useParams } from 'react-router-dom'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import {
  Paper,
  Typography,
  Button,
  Chip,
  Box,
  Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { StatusChip } from '@/components/common/StatusChip'
import { ClinicaInteractiveTimeline } from '@/components/workflow/ClinicaInteractiveTimeline'
import { useClinicaPedido } from '@/hooks/useClinicaPedidos'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { resolveEtapaNomeExibicao } from '@/utils/timelineFlow'
import { formatCurrency, formatNip } from '@/utils/format'

export default function ClinicaTimelineDetailPage() {
  const { id = '' } = useParams()
  const { navigatePortal } = usePortalPaths()
  const { data: pedido, isLoading } = useClinicaPedido(id)
  const { data: etapas = [] } = useWorkflowEtapas()

  if (isLoading) return <LoadingSpinner />
  if (!pedido) {
    return (
      <Box>
        <Typography>Timeline não encontrada.</Typography>
        <Button onClick={() => navigatePortal('/clinica/timelines')} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    )
  }

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigatePortal('/clinica/timelines')}
        sx={{ mb: 2 }}
      >
        Voltar às timelines
      </Button>

      <PageHeader
        title={`Timeline — ${pedido.numero}`}
        titleVariant="h6"
        subtitle={
          pedido.paciente
            ? `${pedido.paciente.nome} · NIP ${formatNip(pedido.paciente.nip)}`
            : `${pedido.empresa.nomeFantasia} · ${pedido.material.descricao}`
        }
        action={<StatusChip status={pedido.prazoStatus} concluido={pedido.concluido} />}
      />

      <Alert severity="info" icon={<VisibilityIcon />} sx={{ mb: 2 }}>
        Após o envio para a Div. de Material, a clínica acompanha todas as etapas em
        visualização até a conclusão do processo.
      </Alert>

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
        {(pedido.etapasAtivasIds?.length
          ? etapas.filter((e) => pedido.etapasAtivasIds.includes(e.id))
          : [pedido.etapaAtual]
        ).map((etapa) => (
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
        <ClinicaInteractiveTimeline
          pedido={pedido}
          etapas={etapas}
          somenteLeitura
        />
      </Box>
    </>
  )
}
