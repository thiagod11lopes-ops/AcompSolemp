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
import DrawIcon from '@mui/icons-material/Draw'
import SendIcon from '@mui/icons-material/Send'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import PersonIcon from '@mui/icons-material/Person'
import DescriptionIcon from '@mui/icons-material/Description'
import { useEffect, useState } from 'react'
import {
  formatSolempNumero,
  formatSolempPreview,
  validateSolempNumero,
  type SolempNumeroParts,
} from '@/utils/solemp'
import { formatCurrency, validateNomeAssinante } from '@/utils/format'

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

export type AssinaturaSolempVariante = 'assinatura1' | 'assinatura2'

const VARIANTES: Record<
  AssinaturaSolempVariante,
  {
    overline: string
    title: string
    etapaDe: string
    etapaPara: string
    submitLabel: string
  }
> = {
  assinatura1: {
    overline: 'Assinatura 1 Solemp',
    title: 'Enviar para Assinatura 2 Solemp',
    etapaDe: 'Assinatura 1 Solemp',
    etapaPara: 'Assinatura 2 Solemp',
    submitLabel: 'Enviar para Assinatura 2 Solemp',
  },
  assinatura2: {
    overline: 'Assinatura 2 Solemp',
    title: 'Enviar para SDA',
    etapaDe: 'Assinatura 2 Solemp',
    etapaPara: 'SDA',
    submitLabel: 'Enviar para SDA',
  },
}

interface AssinaturaSolempModalProps {
  open: boolean
  variante?: AssinaturaSolempVariante
  onClose: () => void
  onEnviar: (dados: { numero: string; valor: number; assinanteNome: string }) => void
  loading?: boolean
  pedidoNumero?: string
  defaults: SolempNumeroParts
  valorSugerido?: number
  assinanteSugerido?: string
}

/** Modal compartilhado de Assinatura 1 (→ Assinatura 2) e Assinatura 2 (→ SDA). */
export function AssinaturaSolempModal({
  open,
  variante = 'assinatura1',
  onClose,
  onEnviar,
  loading = false,
  pedidoNumero,
  defaults,
  valorSugerido = 0,
  assinanteSugerido = '',
}: AssinaturaSolempModalProps) {
  const theme = useTheme()
  const config = VARIANTES[variante]
  const [prefix, setPrefix] = useState(defaults.prefix)
  const [sequencial, setSequencial] = useState(defaults.sequencial)
  const [ano, setAno] = useState(defaults.ano)
  const [valorDisplay, setValorDisplay] = useState('')
  const [assinanteNome, setAssinanteNome] = useState('')
  const [erroNumero, setErroNumero] = useState('')
  const [erroValor, setErroValor] = useState('')
  const [erroNome, setErroNome] = useState('')

  useEffect(() => {
    if (open) {
      setPrefix(defaults.prefix)
      setSequencial(defaults.sequencial)
      setAno(defaults.ano)
      setValorDisplay(valorToDisplay(valorSugerido))
      setAssinanteNome(assinanteSugerido)
      setErroNumero('')
      setErroValor('')
      setErroNome('')
    }
  }, [open, defaults, valorSugerido, assinanteSugerido])

  const parts = { prefix, sequencial, ano }
  const numeroPreview = formatSolempPreview(parts)
  const valor = parseCurrencyDigits(valorDisplay)
  const numeroCompleto =
    sequencial.length === 4 && prefix.length === 5 && ano.length === 4
      ? formatSolempNumero(parts)
      : ''

  const limparErros = () => {
    setErroNumero('')
    setErroValor('')
    setErroNome('')
  }

  const handleEnviar = () => {
    limparErros()
    const numero = formatSolempNumero(parts)
    const numeroErro = validateSolempNumero(numero)
    if (numeroErro) {
      setErroNumero(numeroErro)
      return
    }
    if (valor <= 0) {
      setErroValor('Informe o valor da SOLEMP')
      return
    }
    const nomeErro = validateNomeAssinante(assinanteNome)
    if (nomeErro) {
      setErroNome(nomeErro)
      return
    }
    onEnviar({ numero, valor, assinanteNome: assinanteNome.trim() })
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
              radial-gradient(120% 80% at 0% 0%, ${alpha(theme.palette.warning.main, 0.22)} 0%, transparent 55%),
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
              background: `linear-gradient(145deg, ${theme.palette.warning.main}, ${theme.palette.primary.main})`,
              color: '#fff',
              boxShadow: `0 12px 28px ${alpha(theme.palette.warning.main, 0.45)}`,
            }}
          >
            <DrawIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
              {config.overline}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {config.title}
            </Typography>
            {pedidoNumero && (
              <Chip
                label={pedidoNumero}
                size="small"
                color="warning"
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
            bgcolor: alpha(theme.palette.warning.main, 0.08),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.18)}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Chip label={config.etapaDe} size="small" color="warning" />
          <ArrowForwardIcon fontSize="small" color="action" />
          <Chip label={config.etapaPara} size="small" color="primary" />
        </Box>

        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            mb: 2.5,
            textAlign: 'center',
            bgcolor: alpha(theme.palette.warning.main, 0.06),
            border: `1px dashed ${alpha(theme.palette.warning.main, 0.35)}`,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Pré-visualização da SOLEMP
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, letterSpacing: 1, color: 'warning.main', lineHeight: 1.2 }}
          >
            {numeroPreview}
          </Typography>
          {valor > 0 && (
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>
              {formatCurrency(valor)}
            </Typography>
          )}
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Número da SOLEMP
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Formato oficial: 65720-2636/2025
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          <TextField
            label="Prefixo"
            value={prefix}
            onChange={(e) => {
              setPrefix(e.target.value.replace(/\D/g, '').slice(0, 5))
              setErroNumero('')
            }}
            size="small"
            disabled={loading}
            error={Boolean(erroNumero)}
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
              setErroNumero('')
            }}
            placeholder="0000"
            size="small"
            disabled={loading}
            error={Boolean(erroNumero)}
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
              setErroNumero('')
            }}
            size="small"
            disabled={loading}
            error={Boolean(erroNumero)}
            sx={{ width: 100 }}
            slotProps={{ htmlInput: { maxLength: 4 } }}
          />
        </Box>

        <TextField
          fullWidth
          label="Número completo da SOLEMP"
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
            setErroNumero('')
          }}
          error={Boolean(erroNumero)}
          helperText={erroNumero || 'Somente o número da SOLEMP usa este formato'}
          disabled={loading}
          sx={{
            mb: 2.5,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.default, 0.65),
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <DescriptionIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          fullWidth
          label="Valor da SOLEMP"
          value={valorDisplay}
          onChange={(e) => {
            setValorDisplay(maskCurrencyDigits(e.target.value))
            setErroValor('')
          }}
          placeholder="0,00"
          disabled={loading}
          error={Boolean(erroValor)}
          helperText={erroValor || 'Valor em reais (R$)'}
          sx={{
            mb: 2.5,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.default, 0.65),
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <AttachMoneyIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Nome de quem assinou
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Texto livre — nome da pessoa (não é o número da SOLEMP).
        </Typography>

        <TextField
          fullWidth
          label="Nome de quem assinou"
          value={assinanteNome}
          onChange={(e) => {
            setAssinanteNome(e.target.value)
            setErroNome('')
          }}
          placeholder="Ex.: João da Silva"
          disabled={loading}
          error={Boolean(erroNome)}
          helperText={erroNome || 'Formato livre'}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.default, 0.65),
            },
          }}
          slotProps={{
            htmlInput: {
              inputMode: 'text',
              autoComplete: 'name',
              autoCorrect: 'off',
              spellCheck: true,
            },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
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
              background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.primary.main} 100%)`,
              boxShadow: `0 12px 28px ${alpha(theme.palette.warning.main, 0.4)}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.warning.dark} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 16px 36px ${alpha(theme.palette.warning.main, 0.5)}`,
              },
            }}
          >
            {loading ? 'Enviando...' : config.submitLabel}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

/** @deprecated use AssinaturaSolempModal com variante="assinatura1" */
export function Assinatura1SolempModal(props: Omit<AssinaturaSolempModalProps, 'variante'>) {
  return <AssinaturaSolempModal variante="assinatura1" {...props} />
}
