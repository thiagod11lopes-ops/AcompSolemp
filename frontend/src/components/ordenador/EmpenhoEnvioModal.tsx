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
  InputAdornment,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import NotesIcon from '@mui/icons-material/Notes'
import SendIcon from '@mui/icons-material/Send'
import { useEffect, useState } from 'react'
import { formatEmpenhoNe } from '@/utils/empenho'

interface EmpenhoEnvioModalProps {
  open: boolean
  onClose: () => void
  onEnviar: (dados: { empenhoNumero: string; observacoes: string }) => void
  loading?: boolean
  pedidoNumero?: string
  solempNumero?: string | null
}

/** Modal ao Enviar Planilha em Aguardando NE: número do empenho + observações. */
export function EmpenhoEnvioModal({
  open,
  onClose,
  onEnviar,
  loading = false,
  pedidoNumero,
  solempNumero,
}: EmpenhoEnvioModalProps) {
  const theme = useTheme()
  const [empenhoNumero, setEmpenhoNumero] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [erroEmpenho, setErroEmpenho] = useState('')

  useEffect(() => {
    if (open) {
      setEmpenhoNumero('')
      setObservacoes('')
      setErroEmpenho('')
    }
  }, [open])

  const preview = formatEmpenhoNe(empenhoNumero)

  const handleEnviar = () => {
    setErroEmpenho('')
    const raw = empenhoNumero.trim()
    if (!raw) {
      setErroEmpenho('Informe o número do empenho gerado')
      return
    }
    const formatado = formatEmpenhoNe(raw)
    if (!formatado) {
      setErroEmpenho('Número do empenho inválido')
      return
    }
    onEnviar({
      empenhoNumero: formatado,
      observacoes: observacoes.trim(),
    })
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(10px)',
            backgroundColor: alpha('#0b1220', 0.55),
          },
        },
        paper: {
          sx: {
            borderRadius: 5,
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.warning.main, 0.28)}`,
            background: `
              radial-gradient(120% 80% at 0% 0%, ${alpha(theme.palette.warning.main, 0.2)} 0%, transparent 55%),
              radial-gradient(100% 70% at 100% 100%, ${alpha(theme.palette.primary.main, 0.14)} 0%, transparent 50%),
              ${theme.palette.background.paper}
            `,
            boxShadow: `0 32px 100px ${alpha('#000', 0.35)}`,
          },
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(145deg, ${theme.palette.warning.main}, ${theme.palette.primary.main})`,
              color: '#fff',
              boxShadow: `0 12px 28px ${alpha(theme.palette.warning.main, 0.45)}`,
            }}
          >
            <ReceiptLongIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              Aguardando NE
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Enviar planilha
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
              {pedidoNumero && (
                <Chip label={pedidoNumero} size="small" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
              )}
              {solempNumero && (
                <Chip label={solempNumero} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
              )}
            </Box>
          </Box>
        </Box>
        <IconButton onClick={onClose} disabled={loading} size="small" aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Informe o número do empenho gerado e, se quiser, observações. Esses dados ficam
          registrados nos Arquivados.
        </Typography>

        <TextField
          fullWidth
          required
          label="Número do empenho"
          value={empenhoNumero}
          onChange={(e) => {
            setEmpenhoNumero(e.target.value)
            setErroEmpenho('')
          }}
          placeholder="Ex.: 4451 ou NE 4451"
          disabled={loading}
          error={Boolean(erroEmpenho)}
          helperText={erroEmpenho || (preview ? `Será gravado como ${preview}` : ' ')}
          margin="normal"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <ReceiptLongIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          fullWidth
          label="Observações"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Observações opcionais sobre o empenho"
          disabled={loading}
          margin="normal"
          multiline
          minRows={3}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                  <NotesIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
          <Button onClick={onClose} disabled={loading} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleEnviar}
            disabled={loading}
            startIcon={<SendIcon />}
            sx={{ fontWeight: 700 }}
          >
            {loading ? 'Enviando...' : 'Enviar planilha'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
