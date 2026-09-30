import { Box, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { EnvioFluxoDialog } from '@/components/common/EnvioFluxoDialog'
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
  onEnviar: (dados: { numero: string; valor: number; comentario?: string }) => void
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
  const [prefix, setPrefix] = useState(defaults.prefix)
  const [sequencial, setSequencial] = useState(defaults.sequencial)
  const [ano, setAno] = useState(defaults.ano)
  const [valorDisplay, setValorDisplay] = useState('')
  const [comentario, setComentario] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (open) {
      setPrefix(defaults.prefix)
      setSequencial(defaults.sequencial)
      setAno(defaults.ano)
      setValorDisplay(valorToDisplay(valorSugerido))
      setComentario('')
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
    onEnviar({ numero, valor, comentario: comentario.trim() || undefined })
  }

  const chips = [
    ...(pedidoNumero ? [{ label: pedidoNumero, color: 'primary' as const }] : []),
    { label: 'Confecção → Aguardando NE', color: 'info' as const },
  ]

  return (
    <EnvioFluxoDialog
      open={open}
      title="Enviar planilha"
      onClose={onClose}
      onSubmit={handleEnviar}
      loading={loading}
      submitLabel="Enviar para Aguardando NE"
      chips={chips}
      maxWidth="sm"
    >
      <Box
        sx={{
          mb: 1.5,
          p: 1.25,
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(85, 139, 113, 0.06)',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          Pré-visualização da SOLEMP
        </Typography>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
          {numeroPreview}
        </Typography>
        {valor > 0 && (
          <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25 }}>
            {formatCurrency(valor)}
          </Typography>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Informe o número e o valor da SOLEMP para concluir a confecção e enviar para Aguardando NE.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
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
        <Typography variant="h6" sx={{ pb: 0.5, color: 'text.secondary' }}>
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
        <Typography variant="h6" sx={{ pb: 0.5, color: 'text.secondary' }}>
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
        size="small"
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
        sx={{ mb: 1.5 }}
      />

      <TextField
        fullWidth
        size="small"
        label="Comentários"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Opcional — aparece na aba lateral da timeline com o seu nome"
        disabled={loading}
        multiline
        minRows={2}
      />
    </EnvioFluxoDialog>
  )
}
