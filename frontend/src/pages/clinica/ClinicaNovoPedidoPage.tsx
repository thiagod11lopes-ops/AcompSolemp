import { Box, Button, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { usePortalPaths } from '@/contexts/DemoRouteContext'

export default function ClinicaNovoPedidoPage() {
  const { navigatePortal } = usePortalPaths()

  return (
    <Box sx={{ mb: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
        <Button
          size="small"
          startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
          onClick={() => navigatePortal('/clinica/pedidos')}
          sx={{ minWidth: 0, px: 1, py: 0.25, flexShrink: 0 }}
        >
          Voltar
        </Button>
        <Typography variant="h6" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          Novo Lançamento
        </Typography>
      </Box>
    </Box>
  )
}
