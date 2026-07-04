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
import EditNoteIcon from '@mui/icons-material/EditNote'
import SendIcon from '@mui/icons-material/Send'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import { useEffect, useState } from 'react'
import {
  formatSolempNumero,
  formatSolempPreview,
  validateSolempNumero,
  type SolempNumeroParts,
} from '@/utils/solemp'
import { formatCurrency } from '@/utils/format'

function maskCurrencyDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14)
  if (!digits) return ''
  const value = Number(digits) / 100
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseCurrencyDigits(display: string): number {
  const digits = display.replace(/\D/g, '')
  if (!digits) return 0
  return Number(digits) / 100
}

function valorToDisplay(valor: number): string {
  if (!valor || valor <= 0) return ''
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface ConfeccaoSolempModalProps {
  open: boolean
  onClose: () => void
  onEnviar: (dados: { numero: string; valor: number }) => void
  loading?: boolean
  pedidoNumero?: string
  defaults: SolempNumeroParts
  valorSugerido?: number
}

export function ConfeccaoSolempModal({
  open,
  onClose,
  onEnviar,
  loading = false,
  pedidoNumero,
  defaults,
  valorSugerido = 0,
}: ConfeccaoSolempModalProps) {
  const theme = useTheme()
  const [prefix, setPrefix] = useState(defaults.prefix)
  const [sequencial, setSequencial] = useState(defaults.sequencial)
  const [ano, setAno] = useState(defaults.ano)
  const [valorDisplay, setValorDisplay] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (open) {
      setPrefix(defaults.prefix)
      setSequencial(defaults.sequencial)
      setAno(defaults.ano)
      setValorDisplay(valorToDisplay(valorSugerido))
      setErro('')
    }
  }, [open, defaults, valorSugerido])

  const parts = { prefix, sequencial, ano }
  const numeroPreview = formatSolempPreview(parts)
  const valor = parseCurrencyDigits(valorDisplay)

  const handleEnviar = () => {
    const numero = formatSolempNumero(parts)
    const numeroErro = validateSolempNumero(numero)
    if (numeroErro) {
      setErro(numeroErro)
      return
    }
    if (valor <= 0) {
      setErro('Informe o valor da SOLEMP')
      return
    }
    onEnviar({ numero, valor })
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
            border: `1px solid ${alpha(theme.palette.info.main, 0.28)}`,
            background: `
              radial-gradient(120% 80% at 0% 0%, ${alpha(theme.palette.info.main, 0.22)} 0%, transparent 55%),
              radial-gradient(100% 70% at 100% 100%, ${alpha(theme.palette.primary.main, 0.16)} 0%, transparent 50%),
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
              background: `linear-gradient(145deg, ${theme.palette.info.main}, ${theme.palette.primary.main})`,
              color: '#fff',
              boxShadow: `0 12px 28px ${alpha(theme.palette.info.main, 0.45)}`,
            }}
          >
            <EditNoteIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              Confecção de Solemp
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Enviar para Assinatura 1 Solemp
            </Typography>
            {pedidoNumero && (
              <Chip
                label={pedidoNumero}
                size="small"
                color="info"
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
            mb: 2.5,
            p: 2,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.info.main, 0.08),
            border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Chip label="Confecção de Solemp" size="small" color="info" />
          <ArrowForwardIcon fontSize="small" color="action" />
          <Chip label="Assinatura 1 Solemp" size="small" color="primary" />
        </Box>

        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            mb: 2.5,
            textAlign: 'center',
            bgcolor: alpha(theme.palette.info.main, 0.06),
            border: `1px dashed ${alpha(theme.palette.info.main, 0.35)}`,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Pré-visualização da SOLEMP
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, letterSpacing: 1, color: 'info.main', lineHeight: 1.2 }}
          >
            {numeroPreview}
          </Typography>
          {valor > 0 && (
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>
              {formatCurrency(valor)}
            </Typography>
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Informe o número e o valor da SOLEMP para concluir a confecção e enviar à Assinatura 1.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <TextField
            label="Prefixo"
            value={prefix}
            onChange={(e) => {
              setPrefix(e.target.value.replace(/\D/g, '').slice(0, 5))
              setErro('')
            }}
            size="small"
            disabled={loading}
            sx={{ width: 100 }}
            slotProps={{ htmlInput: { maxLength: 5 } }}
          />
          <Typography variant="h5" sx={{ pb: 0.5, color: 'text.secondary' }}>
            -
          </Typography>
          <TextField
            label="Sequencial"
            value={sequencial}
            onChange={(e) => {
              setSequencial(e.target.value.replace(/\D/g, '').slice(0, 4))
              setErro('')
            }}
            placeholder="0000"
            size="small"
            disabled={loading}
            sx={{ width: 120 }}
            slotProps={{ htmlInput: { maxLength: 4 } }}
          />
          <Typography variant="h5" sx={{ pb: 0.5, color: 'text.secondary' }}>
            /
          </Typography>
          <TextField
            label="Ano"
            value={ano}
            onChange={(e) => {
              setAno(e.target.value.replace(/\D/g, '').slice(0, 4))
              setErro('')
            }}
            size="small"
            disabled={loading}
            sx={{ width: 100 }}
            slotProps={{ htmlInput: { maxLength: 4 } }}
          />
        </Box>

        <TextField
          fullWidth
          label="Valor da SOLEMP"
          value={valorDisplay}
          onChange={(e) => {
            setValorDisplay(maskCurrencyDigits(e.target.value))
            setErro('')
          }}
          placeholder="0,00"
          disabled={loading}
          error={Boolean(erro)}
          helperText={erro || 'Valor em reais (R$)'}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <AttachMoneyIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.default, 0.65),
            },
          }}
        />

        <Box
          sx={{
            mt: 3,
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
            sx={{ borderRadius: 3, py: 1.25 }}
          >
            Cancelar
          </Button>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleEnviar}
            disabled={loading}
            endIcon={<SendIcon />}
            sx={{
              borderRadius: 3,
              py: 1.25,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.primary.main} 100%)`,
              boxShadow: `0 12px 28px ${alpha(theme.palette.info.main, 0.4)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.info.dark} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 16px 36px ${alpha(theme.palette.info.main, 0.5)}`,
              },
            }}
          >
            {loading ? 'Enviando...' : 'Enviar para Assinatura 1 Solemp'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
