import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SendIcon from '@mui/icons-material/Send'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'

interface ClinicaEnvioParaleloModalProps {
  open: boolean
  rows: ConsumoMaterialRow[]
  isSubmitting?: boolean
  onClose: () => void
  onVisualizarAuditoria: () => void
  onVisualizarConfeccao: () => void
  onEnviarAmbas: () => void
}

export function ClinicaEnvioParaleloModal({
  open,
  rows,
  isSubmitting = false,
  onClose,
  onVisualizarAuditoria,
  onVisualizarConfeccao,
  onEnviarAmbas,
}: ClinicaEnvioParaleloModalProps) {
  const total = rows.reduce((sum, row) => sum + (row.valorNumerico || 0), 0)

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Enviar para Auditoria</DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {rows.length} lançamento(s) · {formatValorBrasileiro(total)}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            endIcon={<VisibilityIcon />}
            onClick={onVisualizarAuditoria}
            disabled={isSubmitting || rows.length === 0}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Ver Auditoria
          </Button>
          <Button
            size="small"
            variant="outlined"
            endIcon={<VisibilityIcon />}
            onClick={onVisualizarConfeccao}
            disabled={isSubmitting || rows.length === 0}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Ver Solemp
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onEnviarAmbas}
          disabled={isSubmitting || rows.length === 0}
          startIcon={<SendIcon />}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
