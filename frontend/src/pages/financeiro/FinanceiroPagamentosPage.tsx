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
import PaymentsIcon from '@mui/icons-material/Payments'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useFinanceiroPedidos } from '@/hooks/useFinanceiroPedidos'
import { formatCurrency, formatDate } from '@/utils/format'

export default function FinanceiroPagamentosPage() {
  const { navigatePortal } = usePortalPaths()
  const { data: pedidos = [], isLoading } = useFinanceiroPedidos()

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Pagamentos pendentes"
        subtitle="Processos com NF enviada ao financeiro — selecione a SOLEMP e confirme o pagamento"
      />

      {pedidos.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <PaymentsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            Nenhum pagamento pendente no momento.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {pedidos.map((pedido) => (
            <Grid key={pedido.id} size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ borderLeft: 4, borderColor: 'info.main' }}>
                <CardActionArea onClick={() => navigatePortal(`/financeiro/pagamentos/${pedido.id}`)}>
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
                    <Chip
                      label="Finanças Pagamento — pendente"
                      color="info"
                      size="small"
                      sx={{ mb: 1 }}
                    />
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
