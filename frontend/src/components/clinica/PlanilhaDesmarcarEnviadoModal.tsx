import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'

interface PlanilhaDesmarcarEnviadoModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

/**
 * Confirmação ao desmarcar checklist de linha já enviada (IMH / Div. Material).
 */
export function PlanilhaDesmarcarEnviadoModal({
  open,
  onClose,
  onConfirm,
}: PlanilhaDesmarcarEnviadoModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Item já enviado</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          Este item já foi enviado. Ao desmarcar, ele poderá ser enviado de forma duplicada se a
          linha não for excluída.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="warning"
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Desmarcar mesmo assim
        </Button>
      </DialogActions>
    </Dialog>
  )
}
