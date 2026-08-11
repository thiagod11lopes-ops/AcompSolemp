import {
  Box,
  Button,
  Dialog,
  IconButton,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import { useEffect, useState } from 'react'

interface NovaPlanilhaBrancaModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (nome: string) => void
}

export function NovaPlanilhaBrancaModal({
  open,
  onClose,
  onConfirm,
}: NovaPlanilhaBrancaModalProps) {
  const [nome, setNome] = useState('')

  useEffect(() => {
    if (open) setNome('')
  }, [open])

  const nomeTrim = nome.trim()

  const handleConfirm = () => {
    if (!nomeTrim) return
    onConfirm(nomeTrim)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(11, 61, 145, 0.18)',
          },
        },
      }}
    >
      <Box
        sx={(theme) => ({
          position: 'relative',
          px: 3,
          pt: 2.5,
          pb: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 55%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
        })}
      >
        <IconButton
          onClick={onClose}
          aria-label="Fechar"
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            color: 'white',
            bgcolor: alpha('#fff', 0.12),
            '&:hover': { bgcolor: alpha('#fff', 0.22) },
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <NoteAddIcon sx={{ fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Nova planilha
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.75, pr: 4 }}>
          Informe o nome. A planilha abre em branco, como um arquivo novo do Excel.
        </Typography>
      </Box>

      <Box sx={{ px: 3, py: 3, display: 'grid', gap: 2.5 }}>
        <TextField
          autoFocus
          label="Nome da planilha"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Planilha julho"
          fullWidth
          size="small"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm()
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!nomeTrim}
            onClick={handleConfirm}
            sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}
          >
            Criar planilha
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}
