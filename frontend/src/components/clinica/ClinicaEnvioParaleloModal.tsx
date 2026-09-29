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
import InventoryIcon from '@mui/icons-material/Inventory'
import DescriptionIcon from '@mui/icons-material/Description'
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
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 800 }}>Div. de Material — Auditoria</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {rows.length} lançamento(s) selecionado(s) · Total {formatValorBrasileiro(total)}. A
          Auditoria encaminhará a planilha para IMH e Confecção de Solemp.
        </Typography>

        <Stack spacing={1.25}>
          <Button
            fullWidth
            variant="outlined"
            color="info"
            startIcon={<DescriptionIcon />}
            endIcon={<VisibilityIcon />}
            onClick={onVisualizarAuditoria}
            disabled={isSubmitting || rows.length === 0}
            sx={{
              justifyContent: 'space-between',
              py: 1.5,
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            Visualizar planilha — Auditoria
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="primary"
            startIcon={<InventoryIcon />}
            endIcon={<VisibilityIcon />}
            onClick={onVisualizarConfeccao}
            disabled={isSubmitting || rows.length === 0}
            sx={{
              justifyContent: 'space-between',
              py: 1.5,
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            Visualizar planilha — Confecção de Solemp
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Após a Auditoria, a planilha segue para IMH e Confecção de Solemp.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
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
          {isSubmitting ? 'Enviando...' : 'Enviar para Auditoria'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
