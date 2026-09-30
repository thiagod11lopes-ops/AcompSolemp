import { Box, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { EnvioFluxoDialog } from '@/components/common/EnvioFluxoDialog'
import { formatEmpenhoNe } from '@/utils/empenho'

interface FinanceiroPagamentoModalProps {
  open: boolean
  onClose: () => void
  onRegistrar: (dados: {
    notaFiscalNumero: string
    empresaNome: string
    empenhoNumero: string
    observacoes: string
  }) => void
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
  const [notaFiscalNumero, setNotaFiscalNumero] = useState('')
  const [empresaNome, setEmpresaNome] = useState('')
  const [empenhoNumero, setEmpenhoNumero] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [erroNota, setErroNota] = useState('')
  const [erroEmpresa, setErroEmpresa] = useState('')
  const [erroEmpenho, setErroEmpenho] = useState('')

  useEffect(() => {
    if (open) {
      setNotaFiscalNumero('')
      setEmpresaNome(empresaSugerida)
      setEmpenhoNumero('')
      setObservacoes('')
      setErroNota('')
      setErroEmpresa('')
      setErroEmpenho('')
    }
  }, [open, empresaSugerida])

  const empenhoPreview = formatEmpenhoNe(empenhoNumero)

  const handleRegistrar = () => {
    setErroNota('')
    setErroEmpresa('')
    setErroEmpenho('')
    const nf = notaFiscalNumero.trim()
    const empresa = empresaNome.trim()
    const empenhoFormatado = formatEmpenhoNe(empenhoNumero)
    if (!nf) {
      setErroNota('Informe o número da nota fiscal')
      return
    }
    if (empresa.length < 2) {
      setErroEmpresa('Informe o nome da empresa')
      return
    }
    if (!empenhoNumero.trim() || !empenhoFormatado) {
      setErroEmpenho('Informe o número do empenho gerado')
      return
    }
    onRegistrar({
      notaFiscalNumero: nf,
      empresaNome: empresa,
      empenhoNumero: empenhoFormatado,
      observacoes: observacoes.trim(),
    })
  }

  const chips = [
    ...(pedidoNumero ? [{ label: pedidoNumero, color: 'primary' as const }] : []),
    { label: 'Aguardando NE', color: 'warning' as const },
  ]

  return (
    <EnvioFluxoDialog
      open={open}
      title="Registrar pagamento"
      onClose={onClose}
      onSubmit={handleRegistrar}
      loading={loading}
      loadingLabel="Registrando..."
      submitLabel="Registrar o pagamento"
      submitDisabled={!solempNumero || solempNumero === 'Não informada'}
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
          Número da SOLEMP
        </Typography>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
          {solempNumero}
        </Typography>
      </Box>

      <TextField
        fullWidth
        size="small"
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
        sx={{ mb: 1.5 }}
      />

      <TextField
        fullWidth
        size="small"
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
        sx={{ mb: 1.5 }}
      />

      <TextField
        fullWidth
        size="small"
        label="Número do empenho"
        value={empenhoNumero}
        onChange={(e) => {
          setEmpenhoNumero(e.target.value)
          setErroEmpenho('')
        }}
        placeholder="Ex.: 4451 ou NE 4451"
        disabled={loading}
        error={Boolean(erroEmpenho)}
        helperText={
          erroEmpenho ||
          (empenhoPreview
            ? `Será gravado como ${empenhoPreview}`
            : 'Obrigatório — vai para Arquivados')
        }
        sx={{ mb: 1.5 }}
      />

      <TextField
        fullWidth
        size="small"
        label="Observações"
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
        placeholder="Opcional"
        disabled={loading}
        multiline
        minRows={2}
      />
    </EnvioFluxoDialog>
  )
}
