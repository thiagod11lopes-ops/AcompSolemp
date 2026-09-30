import { TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { EnvioFluxoDialog } from '@/components/common/EnvioFluxoDialog'

export type SetorConclusaoVariante = 'auditoria' | 'contabilidade'

interface VarianteConfig {
  title: string
  chips: Array<{ label: string; color?: 'primary' | 'info' | 'success' | 'warning' }>
  notesHint: string
  placeholder: string
  submitLabel: string
}

const VARIANTES: Record<SetorConclusaoVariante, VarianteConfig> = {
  auditoria: {
    title: 'Enviar planilha',
    chips: [
      { label: 'Auditoria', color: 'warning' },
      { label: '→ IMH e Confecção', color: 'primary' },
    ],
    notesHint:
      'Comentários são opcionais. A planilha será enviada para IMH e Confecção de Solemp.',
    placeholder: 'Escreva comentários para IMH e Confecção, se necessário…',
    submitLabel: 'Enviar planilha',
  },
  contabilidade: {
    title: 'Enviar planilha',
    chips: [
      { label: 'IMH', color: 'warning' },
      { label: 'Etapa concluída', color: 'success' },
    ],
    notesHint: 'Comentários são opcionais. Se quiser, registre observações ao concluir a IMH.',
    placeholder: 'Escreva comentários da IMH, se necessário…',
    submitLabel: 'Enviar planilha',
  },
}

interface SetorConclusaoModalProps {
  open: boolean
  variante: SetorConclusaoVariante
  onClose: () => void
  onEnviar: (anotacoes: string) => void
  loading?: boolean
  pedidoNumero?: string
}

export function SetorConclusaoModal({
  open,
  variante,
  onClose,
  onEnviar,
  loading = false,
  pedidoNumero,
}: SetorConclusaoModalProps) {
  const [anotacoes, setAnotacoes] = useState('')
  const config = VARIANTES[variante]
  const chips = [
    ...(pedidoNumero ? [{ label: pedidoNumero, color: 'primary' as const }] : []),
    ...config.chips,
  ]

  useEffect(() => {
    if (open) setAnotacoes('')
  }, [open, variante])

  return (
    <EnvioFluxoDialog
      open={open}
      title={config.title}
      onClose={onClose}
      onSubmit={() => onEnviar(anotacoes.trim())}
      loading={loading}
      submitLabel={config.submitLabel}
      chips={chips}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {config.notesHint}
      </Typography>
      <TextField
        fullWidth
        size="small"
        label="Comentários"
        placeholder={config.placeholder}
        value={anotacoes}
        onChange={(e) => setAnotacoes(e.target.value)}
        disabled={loading}
        multiline
        minRows={2}
      />
    </EnvioFluxoDialog>
  )
}
