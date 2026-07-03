import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  alpha,
  useTheme,
  Chip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import UndoIcon from '@mui/icons-material/Undo'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useEffect, useState } from 'react'

interface RevertTimelineModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (motivo: string) => void
  loading?: boolean
  etapaDe: string
  etapaPara: string
}

export function RevertTimelineModal({
  open,
  onClose,
  onConfirm,
  loading,
  etapaDe,
  etapaPara,
}: RevertTimelineModalProps) {
  const theme = useTheme()
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (open) {
      setMotivo('')
      setErro('')
    }
  }, [open])

  const handleConfirm = () => {
    if (motivo.trim().length < 10) {
      setErro('Descreva o motivo com pelo menos 10 caracteres')
      return
    }
    onConfirm(motivo.trim())
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            background: `linear-gradient(145deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${theme.palette.background.paper} 45%)`,
            boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          },
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.warning.main, 0.08),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.warning.main, 0.2),
              color: 'warning.dark',
            }}
          >
            <UndoIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Voltar etapa na timeline
            </Typography>
            <Typography variant="caption" color="text.secondary">
              O gestor será notificado automaticamente
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip label={etapaDe} color="error" variant="outlined" size="small" />
          <UndoIcon fontSize="small" color="action" />
          <Chip label={etapaPara} color="primary" variant="outlined" size="small" />
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            p: 2,
            mb: 2,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.warning.main, 0.08),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
          }}
        >
          <WarningAmberIcon color="warning" fontSize="small" />
          <Typography variant="body2">
            Esta ação requer justificativa. O gestor poderá visualizar, responder ou registrar
            ciência da situação.
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Motivo da reversão"
          placeholder="Explique brevemente por que é necessário voltar nesta etapa..."
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value)
            setErro('')
          }}
          error={Boolean(erro)}
          helperText={erro || `${motivo.length} caracteres — mínimo 10`}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.paper, 0.8),
            },
          }}
        />

        <Box sx={{ display: 'flex', gap: 1.5, mt: 3, justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="outlined" disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="warning"
            disabled={loading}
            startIcon={<UndoIcon />}
          >
            {loading ? 'Revertendo...' : 'Confirmar reversão'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
