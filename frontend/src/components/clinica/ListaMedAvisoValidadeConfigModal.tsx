import { useEffect, useState } from 'react'
import { Close as CloseIcon } from '@mui/icons-material'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import {
  getListaMedAvisoValidadeDias,
  setListaMedAvisoValidadeDias,
} from '@/utils/listaMedicamentosForm'

interface ListaMedAvisoValidadeConfigModalProps {
  open: boolean
  onClose: () => void
  onSaved: (dias: number) => void
}

export function ListaMedAvisoValidadeConfigModal({
  open,
  onClose,
  onSaved,
}: ListaMedAvisoValidadeConfigModalProps) {
  const [dias, setDias] = useState(String(getListaMedAvisoValidadeDias()))
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open) return
    setDias(String(getListaMedAvisoValidadeDias()))
    setErro('')
  }, [open])

  const handleSave = () => {
    const n = Number.parseInt(dias.trim(), 10)
    if (!Number.isFinite(n) || n < 1 || n > 3650) {
      setErro('Informe um número de dias entre 1 e 3650.')
      return
    }
    setListaMedAvisoValidadeDias(n)
    onSaved(n)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        Aviso de validade
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'grid', gap: 1.25 }}>
        <Typography variant="body2" color="text.secondary">
          Defina com quantos dias de antecedência o medicamento entra em “próximo do vencimento”.
        </Typography>
        <TextField
          label="Dias de antecedência"
          value={dias}
          onChange={(e) => {
            setDias(e.target.value.replace(/[^\d]/g, '').slice(0, 4))
            setErro('')
          }}
          fullWidth
          size="small"
          autoFocus
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          helperText="Ex.: 30 = avisa nos 30 dias antes da validade"
        />
        {erro ? (
          <Typography variant="body2" color="error" sx={{ fontWeight: 600 }}>
            {erro}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSave} sx={{ textTransform: 'none' }}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
