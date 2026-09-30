import { TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { EnvioFluxoDialog } from '@/components/common/EnvioFluxoDialog'
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

  const chips = [
    ...(pedidoNumero ? [{ label: pedidoNumero, color: 'primary' as const }] : []),
    ...(solempNumero ? [{ label: solempNumero, color: 'info' as const }] : []),
    { label: 'Aguardando NE', color: 'warning' as const },
  ]

  return (
    <EnvioFluxoDialog
      open={open}
      title="Enviar planilha"
      onClose={onClose}
      onSubmit={handleEnviar}
      loading={loading}
      chips={chips}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Informe o número do empenho gerado e, se quiser, observações. Esses dados ficam
        registrados nos Arquivados.
      </Typography>
      <TextField
        fullWidth
        size="small"
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
        sx={{ mb: 1.5 }}
      />
      <TextField
        fullWidth
        size="small"
        label="Comentários"
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
        placeholder="Opcional — aparece na aba lateral da timeline com o seu nome"
        disabled={loading}
        multiline
        minRows={2}
      />
    </EnvioFluxoDialog>
  )
}
