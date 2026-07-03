import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  alpha,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { useEffect, useState } from 'react'

interface NotaFiscalModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (numero: string) => void
  loading?: boolean
}

function formatNumeroDisplay(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

export function NotaFiscalModal({ open, onClose, onConfirm, loading }: NotaFiscalModalProps) {
  const theme = useTheme()
  const [numero, setNumero] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (open) {
      setNumero('')
      setErro('')
    }
  }, [open])

  const numeroLimpo = numero.replace(/\D/g, '')
  const preview = numeroLimpo ? formatNumeroDisplay(numeroLimpo) : '—'

  const handleConfirm = () => {
    const limpo = numero.trim()
    if (limpo.length < 1) {
      setErro('Informe o número da nota fiscal')
      return
    }
    if (limpo.length > 20) {
      setErro('Número muito longo (máx. 20 caracteres)')
      return
    }
    onConfirm(limpo)
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
            background: `linear-gradient(160deg, ${alpha(theme.palette.success.main, 0.12)} 0%, ${theme.palette.background.paper} 42%, ${alpha(theme.palette.info.main, 0.06)} 100%)`,
            boxShadow: `0 28px 90px ${alpha(theme.palette.success.main, 0.18)}, 0 8px 32px rgba(0,0,0,0.12)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
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
          borderColor: alpha(theme.palette.success.main, 0.15),
          background: `linear-gradient(90deg, ${alpha(theme.palette.success.main, 0.1)} 0%, transparent 100%)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
              color: 'success.contrastText',
              boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.45)}`,
            }}
          >
            <ReceiptLongIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: -0.3 }}>
              Anexar Nota Fiscal
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Informe o número da NF para encaminhar ao financeiro
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ bgcolor: alpha(theme.palette.divider, 0.4) }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 3 }}>
        <Box
          sx={{
            position: 'relative',
            p: 3,
            borderRadius: 3,
            mb: 3,
            textAlign: 'center',
            overflow: 'hidden',
            background: `linear-gradient(145deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
            border: `1px dashed ${alpha(theme.palette.success.main, 0.35)}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -40,
              right: -40,
              width: 120,
              height: 120,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.success.main, 0.06),
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              textTransform: 'uppercase',
              letterSpacing: 2,
              fontWeight: 700,
              color: 'success.main',
            }}
          >
            Número da NF
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              letterSpacing: 1.5,
              color: 'success.dark',
              mt: 0.5,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {preview}
          </Typography>
        </Box>

        <TextField
          fullWidth
          autoFocus
          label="Número da nota fiscal"
          value={numero}
          onChange={(e) => {
            setNumero(e.target.value)
            setErro('')
          }}
          placeholder="Ex.: 123456 ou 352.001.234/0001"
          error={Boolean(erro)}
          helperText={erro || 'Digite o número conforme consta na nota fiscal'}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm()
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <ReceiptLongIcon fontSize="small" color="success" />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              bgcolor: alpha(theme.palette.background.paper, 0.8),
            },
          }}
        />

        <Box sx={{ display: 'flex', gap: 1.5, mt: 3, justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="outlined" disabled={loading} sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="success"
            disabled={loading}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 700,
              boxShadow: `0 8px 20px ${alpha(theme.palette.success.main, 0.35)}`,
            }}
          >
            {loading ? 'Registrando...' : 'Confirmar e enviar ao Financeiro'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
