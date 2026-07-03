import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Typography,
} from '@mui/material'
import DrawIcon from '@mui/icons-material/Draw'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useOrdenadorPedidos } from '@/hooks/useOrdenadorPedidos'
import { formatCurrency, formatDate } from '@/utils/format'

export default function OrdenadorTimelinesPage() {
  const navigate = useNavigate()
  const { data: pedidos = [], isLoading } = useOrdenadorPedidos()

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="SOLEMP aguardando assinatura"
        subtitle="Timelines de todas as clínicas com SOLEMP criada — assine para concluir os estágios"
      />

      {pedidos.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <DrawIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            Nenhuma SOLEMP pendente de assinatura no momento.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {pedidos.map((pedido) => (
            <Grid key={pedido.id} size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
                <CardActionArea onClick={() => navigate(`/ordenador/timelines/${pedido.id}`)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {pedido.numero}
                      </Typography>
                      {pedido.solemp && (
                        <Chip label={pedido.solemp.numero} color="primary" size="small" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {pedido.clinica.nome} · {pedido.material.descricao}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Etapa:</strong> {pedido.etapaAtual.nome}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={formatCurrency(pedido.valor)} size="small" variant="outlined" />
                      <Chip
                        label={`Solicitação: ${formatDate(pedido.dataSolicitacao)}`}
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
