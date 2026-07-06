import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  alpha,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'

interface ExcluirPlanilhaDialogProps {
  open: boolean
  totalLancamentos: number
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ExcluirPlanilhaDialog({
  open,
  totalLancamentos,
  isDeleting,
  onClose,
  onConfirm,
}: ExcluirPlanilhaDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={isDeleting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 3, overflow: 'hidden' },
        },
      }}
    >
      <DialogTitle
        sx={(theme) => ({
          background: `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 2.5,
        })}
      >
        <WarningAmberIcon />
        Excluir tudo
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="body1" sx={{ mb: 1.5 }}>
          Tem certeza que deseja excluir <strong>todos os lançamentos</strong> da planilha?
        </Typography>
        <Box
          sx={(theme) => ({
            p: 2,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.error.main, 0.08),
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
          })}
        >
          <Typography variant="body2" color="text.secondary">
            Serão removidos <strong>{totalLancamentos} pedido(s)</strong> do sistema e todos os
            rascunhos pendentes. Esta ação não pode ser desfeita.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={isDeleting} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteForeverIcon />}
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? 'Excluindo...' : 'Excluir tudo'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
