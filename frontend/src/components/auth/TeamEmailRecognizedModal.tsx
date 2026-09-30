import { useState } from 'react'
import { Alert, Box, Typography } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { EnvioFluxoDialog } from '@/components/common/EnvioFluxoDialog'

interface TeamEmailRecognizedModalProps {
  open: boolean
  email: string
  gestorEmail: string | null
  /**
   * Setores/tipos liberados pelo gestor (ex.: Clínica, Confecção de Solemp).
   * Aceita um rótulo único (legado) ou a lista completa.
   */
  perfilLabel?: string | null
  perfilLabels?: string[] | null
  onAccept: () => void
  onDecline: () => Promise<void>
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        px: 1.25,
        py: 1,
        borderRadius: '10px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: 'text.secondary',
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
        {value}
      </Typography>
    </Box>
  )
}

/** Modal de convite no primeiro acesso: e-mail liberado pelo gestor em Cadastros. */
export function TeamEmailRecognizedModal({
  open,
  email,
  gestorEmail,
  perfilLabel,
  perfilLabels,
  onAccept,
  onDecline,
}: TeamEmailRecognizedModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const labels = (
    perfilLabels?.filter((l) => l.trim().length > 0) ??
    (perfilLabel?.trim() ? [perfilLabel.trim()] : [])
  )

  const representText =
    labels.length === 0
      ? 'um setor da organização'
      : labels.length === 1
        ? labels[0]
        : labels.slice(0, -1).join(', ') + ' e ' + labels[labels.length - 1]

  const handleDecline = async () => {
    setError('')
    setLoading(true)
    try {
      await onDecline()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível recusar o convite.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <EnvioFluxoDialog
      open={open}
      title="E-mail cadastrado pelo gestor"
      onClose={() => undefined}
      onCancel={() => void handleDecline()}
      onSubmit={onAccept}
      loading={loading}
      cancelLabel="Não aceitar"
      cancelLoadingLabel="Removendo..."
      submitLabel="Aceitar cadastro"
      submitStartIcon={<CheckCircleRoundedIcon />}
      preventDismiss
      chips={[{ label: 'Cadastro do gestor', color: 'success' }]}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Este e-mail foi cadastrado para representar{' '}
        <strong>{representText}</strong>. Aceite para entrar no banco de dados do
        gestor ou recuse para ficar livre e criar o seu próprio Portal do Gestor.
      </Typography>

      <Box
        sx={{
          mb: 1.5,
          p: 1.25,
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(85, 139, 113, 0.06)',
          display: 'grid',
          gap: 0.75,
        }}
      >
        <InfoRow
          label="Gestor que cadastrou"
          value={gestorEmail || 'E-mail do gestor indisponível'}
        />
        <InfoRow label="Seu e-mail" value={email} />
        {labels.length > 0 && (
          <Box
            sx={{
              px: 1.25,
              py: 1,
              borderRadius: '10px',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: 'text.secondary',
                mb: 0.25,
              }}
            >
              {labels.length > 1 ? 'Setores a representar' : 'Setor a representar'}
            </Typography>
            <Box
              component="ul"
              sx={{
                m: 0,
                pl: labels.length > 1 ? 2.25 : 0,
                listStyle: labels.length > 1 ? 'disc' : 'none',
              }}
            >
              {labels.map((label) => (
                <Typography
                  key={label}
                  component="li"
                  variant="body2"
                  sx={{ fontWeight: 700, lineHeight: 1.45 }}
                >
                  {label}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: error ? 1.5 : 0, lineHeight: 1.45 }}
      >
        <strong>Aceitar cadastro</strong> pede para criar uma senha e entra na
        organização do gestor.
        {' '}
        <strong>Não aceitar</strong> remove seu e-mail da lista de Cadastros desse
        gestor e libera a criação do seu próprio banco como Gestor.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}
    </EnvioFluxoDialog>
  )
}
