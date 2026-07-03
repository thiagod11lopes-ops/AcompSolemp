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
import DescriptionIcon from '@mui/icons-material/Description'
import { useEffect, useState } from 'react'
import {
  formatSolempNumero,
  formatSolempPreview,
  validateSolempNumero,
  type SolempNumeroParts,
} from '@/utils/solemp'

interface SolempModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (numero: string) => void
  loading?: boolean
  defaults: SolempNumeroParts
}

export function SolempModal({ open, onClose, onConfirm, loading, defaults }: SolempModalProps) {
  const theme = useTheme()
  const [prefix, setPrefix] = useState(defaults.prefix)
  const [sequencial, setSequencial] = useState(defaults.sequencial)
  const [ano, setAno] = useState(defaults.ano)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (open) {
      setPrefix(defaults.prefix)
      setSequencial(defaults.sequencial)
      setAno(defaults.ano)
      setErro('')
    }
  }, [open, defaults])

  const parts = { prefix, sequencial, ano }
  const numeroPreview = formatSolempPreview(parts)
  const numeroCompleto =
    sequencial.length === 4 && prefix.length === 5 && ano.length === 4
      ? formatSolempNumero(parts)
      : ''

  const handleConfirm = () => {
    const numero = formatSolempNumero(parts)
    const msg = validateSolempNumero(numero)
    if (msg) {
      setErro(msg)
      return
    }
    onConfirm(numero)
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
            background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${theme.palette.background.paper} 40%)`,
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
          background: alpha(theme.palette.primary.main, 0.06),
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
              bgcolor: alpha(theme.palette.primary.main, 0.15),
              color: 'primary.main',
            }}
          >
            <DescriptionIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Confeccionar SOLEMP
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Informe o número no padrão oficial
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          O prefixo é sugerido com base na última SOLEMP confeccionada, mas pode ser alterado.
          Informe o sequencial e confira o ano.
        </Typography>

        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
            mb: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Pré-visualização
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 1, color: 'primary.main' }}>
            {numeroPreview}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            label="Prefixo"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.replace(/\D/g, '').slice(0, 5))}
            size="small"
            sx={{ width: 100 }}
            slotProps={{ htmlInput: { maxLength: 5 } }}
          />
          <Typography variant="h5" sx={{ pb: 0.5, color: 'text.secondary' }}>
            -
          </Typography>
          <TextField
            label="Sequencial"
            value={sequencial}
            onChange={(e) => setSequencial(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            size="small"
            sx={{ width: 120 }}
            slotProps={{ htmlInput: { maxLength: 4 } }}
          />
          <Typography variant="h5" sx={{ pb: 0.5, color: 'text.secondary' }}>
            /
          </Typography>
          <TextField
            label="Ano"
            value={ano}
            onChange={(e) => setAno(e.target.value.replace(/\D/g, '').slice(0, 4))}
            size="small"
            sx={{ width: 100 }}
            slotProps={{ htmlInput: { maxLength: 4 } }}
          />
        </Box>

        <TextField
          fullWidth
          label="Número completo"
          value={numeroCompleto}
          placeholder="65720-2636/2025"
          onChange={(e) => {
            const val = e.target.value
            const m = val.match(/^(\d{0,5})-?(\d{0,4})\/?(\d{0,4})?/)
            if (m) {
              if (m[1] !== undefined) setPrefix(m[1])
              if (m[2] !== undefined) setSequencial(m[2])
              if (m[3] !== undefined) setAno(m[3])
            }
            setErro('')
          }}
          error={Boolean(erro)}
          helperText={erro || 'Formato: 65720-2636/2025'}
          sx={{ mt: 2 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <DescriptionIcon fontSize="small" color="primary" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: 'flex', gap: 1.5, mt: 3, justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="outlined" disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} variant="contained" disabled={loading}>
            {loading ? 'Registrando...' : 'Confirmar SOLEMP'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
