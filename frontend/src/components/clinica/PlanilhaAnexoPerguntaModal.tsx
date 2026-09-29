import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import AttachFileIcon from '@mui/icons-material/AttachFile'

interface PlanilhaAnexoPerguntaModalProps {
  open: boolean
  onClose: () => void
  onSim: () => void
  onNao: () => void
}

export function PlanilhaAnexoPerguntaModal({
  open,
  onClose,
  onSim,
  onNao,
}: PlanilhaAnexoPerguntaModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Deseja enviar algum arquivo em anexo?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Você pode anexar documentos de texto, PDF, Word, Excel, LibreOffice e formatos
          relacionados antes de concluir o envio.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onNao} color="inherit">
          Não
        </Button>
        <Button variant="contained" color="primary" onClick={onSim} startIcon={<AttachFileIcon />}>
          Sim
        </Button>
      </DialogActions>
    </Dialog>
  )
}
