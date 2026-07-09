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
import { StatusChip } from '@/components/common/StatusChip'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useClinicaPedidos } from '@/hooks/useClinicaPedidos'
import { formatDate, formatNip } from '@/utils/format'

export default function ClinicaTimelinePage() {
  const { navigatePortal } = usePortalPaths()
  const { data: pedidos = [], isLoading } = useClinicaPedidos()

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Timelines"
        subtitle="Todas as timelines de pedidos criados pela sua clínica"
      />

      {pedidos.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <TimelineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            Nenhuma timeline criada ainda. Vá em Novo Pedido e clique em Solicitar Material.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {pedidos.map((pedido) => (
              <Grid key={pedido.id} size={{ xs: 12, md: 6 }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: 4 },
                  }}
                >
                  <CardActionArea
                    onClick={() => navigatePortal(`/clinica/timeline/${pedido.id}`)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {pedido.numero}
                        </Typography>
                        <StatusChip
                          status={pedido.prazoStatus}
                          concluido={pedido.concluido}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {pedido.paciente
                          ? `${pedido.paciente.nome} · NIP ${formatNip(pedido.paciente.nip)}`
                          : `${pedido.material.descricao} · ${pedido.empresa.nomeFantasia}`}
                        {pedido.dadosClinica
                          ? ` · ${pedido.dadosClinica.procedimento}`
                          : ''}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Etapa:</strong> {pedido.etapaAtual.nome}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <Chip
                          label={`Início: ${formatDate(pedido.dataSolicitacao)}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
          ))}
        </Grid>
      )}
    </>
  )
}
