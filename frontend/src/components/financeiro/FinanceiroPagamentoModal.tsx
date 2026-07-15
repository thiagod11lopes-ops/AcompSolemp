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
import PaymentsIcon from '@mui/icons-material/Payments'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import BusinessIcon from '@mui/icons-material/Business'
import { useEffect, useState } from 'react'

interface FinanceiroPagamentoModalProps {
  open: boolean
  onClose: () => void
  onRegistrar: (dados: { notaFiscalNumero: string; empresaNome: string }) => void
  loading?: boolean
  pedidoNumero?: string
  solempNumero: string
  empresaSugerida?: string
}

export function FinanceiroPagamentoModal({
  open,
  onClose,
  onRegistrar,
  loading = false,
  pedidoNumero,
  solempNumero,
  empresaSugerida = '',
}: FinanceiroPagamentoModalProps) {
  const theme = useTheme()
  const [notaFiscalNumero, setNotaFiscalNumero] = useState('')
  const [empresaNome, setEmpresaNome] = useState('')
  const [erroNota, setErroNota] = useState('')
  const [erroEmpresa, setErroEmpresa] = useState('')

  useEffect(() => {
    if (open) {
      setNotaFiscalNumero('')
      setEmpresaNome(empresaSugerida)
      setErroNota('')
      setErroEmpresa('')
    }
  }, [open, empresaSugerida])

  const handleRegistrar = () => {
    setErroNota('')
    setErroEmpresa('')
    const nf = notaFiscalNumero.trim()
    const empresa = empresaNome.trim()
    if (!nf) {
      setErroNota('Informe o número da nota fiscal')
      return
    }
    if (empresa.length < 2) {
      setErroEmpresa('Informe o nome da empresa')
      return
    }
    onRegistrar({ notaFiscalNumero: nf, empresaNome: empresa })
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
            border: `1px solid ${alpha(theme.palette.success.main, 0.28)}`,
            background: `
              radial-gradient(120% 80% at 0% 0%, ${alpha(theme.palette.success.main, 0.2)} 0%, transparent 55%),
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
              background: `linear-gradient(145deg, ${theme.palette.success.main}, ${theme.palette.primary.main})`,
              color: '#fff',
              boxShadow: `0 12px 28px ${alpha(theme.palette.success.main, 0.45)}`,
            }}
          >
            <PaymentsIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              Solemp confeccionada
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Registrar pagamento
            </Typography>
            {pedidoNumero && (
              <Chip
                label={pedidoNumero}
                size="small"
                color="success"
                variant="outlined"
                sx={{ mt: 1, fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} disabled={loading} size="small" aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pb: 3, pt: 0 }}>
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            mb: 2.5,
            textAlign: 'center',
            bgcolor: alpha(theme.palette.success.main, 0.06),
            border: `1px dashed ${alpha(theme.palette.success.main, 0.35)}`,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Número da SOLEMP
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, letterSpacing: 1, color: 'success.main', lineHeight: 1.2 }}
          >
            {solempNumero}
          </Typography>
        </Box>

        <TextField
          fullWidth
          label="Número da nota fiscal"
          value={notaFiscalNumero}
          onChange={(e) => {
            setNotaFiscalNumero(e.target.value)
            setErroNota('')
          }}
          placeholder="Ex.: 123456"
          disabled={loading}
          error={Boolean(erroNota)}
          helperText={erroNota || 'Obrigatório'}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.default, 0.65),
            },
          }}
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
          label="Nome da empresa"
          value={empresaNome}
          onChange={(e) => {
            setEmpresaNome(e.target.value)
            setErroEmpresa('')
          }}
          placeholder="Razão social ou nome fantasia"
          disabled={loading}
          error={Boolean(erroEmpresa)}
          helperText={erroEmpresa || 'Obrigatório'}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.default, 0.65),
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <BusinessIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            disabled={loading}
            sx={{ borderRadius: 3, py: 1.25, fontWeight: 700 }}
          >
            Cancelar
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="success"
            size="large"
            onClick={handleRegistrar}
            disabled={loading || !solempNumero || solempNumero === 'Não informada'}
            startIcon={<PaymentsIcon />}
            sx={{
              borderRadius: 3,
              py: 1.25,
              fontWeight: 700,
              boxShadow: `0 12px 28px ${alpha(theme.palette.success.main, 0.35)}`,
            }}
          >
            {loading ? 'Registrando...' : 'Registrar o pagamento'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
