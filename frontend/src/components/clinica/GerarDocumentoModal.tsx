import { useEffect, useState } from 'react'
import { Close as CloseIcon } from '@mui/icons-material'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material'
import type { GerarDocumentoFormato } from '@/utils/gerarDocumentoTabela'

interface GerarDocumentoModalProps {
  open: boolean
  titulo?: string
  disabled?: boolean
  onClose: () => void
  onConfirm: (formato: GerarDocumentoFormato) => void | Promise<void>
}

export function GerarDocumentoModal({
  open,
  titulo = 'Gerar Documento',
  disabled = false,
  onClose,
  onConfirm,
}: GerarDocumentoModalProps) {
  const [formato, setFormato] = useState<GerarDocumentoFormato>('xlsx')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open) return
    setFormato('xlsx')
    setErro('')
    setBusy(false)
  }, [open])

  const handleConfirm = async () => {
    setErro('')
    setBusy(true)
    try {
      await onConfirm(formato)
      onClose()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao gerar o documento.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        {titulo}
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          disabled={busy}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Selecione o formato do documento para download.
        </Typography>
        <FormControl disabled={busy || disabled}>
          <RadioGroup
            value={formato}
            onChange={(e) => setFormato(e.target.value as GerarDocumentoFormato)}
          >
            <FormControlLabel
              value="pdf"
              control={<Radio />}
              label="PDF (.pdf) — visual da planilha em A4"
            />
            <FormControlLabel value="xlsx" control={<Radio />} label="Excel (.xlsx)" />
          </RadioGroup>
        </FormControl>
        {formato === 'pdf' ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            O PDF abre no estilo da planilha da tela. Use “Salvar como PDF” na impressão. Folha em
            paisagem automaticamente se a grade for muito larga.
          </Typography>
        ) : null}
        {erro ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="error" sx={{ fontWeight: 600 }}>
              {erro}
            </Typography>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none' }}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={busy || disabled}
          sx={{ textTransform: 'none' }}
        >
          {busy ? 'Gerando…' : 'Gerar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
