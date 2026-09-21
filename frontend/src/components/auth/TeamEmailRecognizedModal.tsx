import { useState } from 'react'
import { Alert, Box, Button, Dialog, Fade, Stack, Typography, keyframes } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded'

const pulseRing = keyframes`
  0% { transform: scale(0.85); opacity: 0.55; }
  70% { transform: scale(1.35); opacity: 0; }
  100% { transform: scale(1.35); opacity: 0; }
`

const floatIn = keyframes`
  from { opacity: 0; transform: translateY(18px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

interface TeamEmailRecognizedModalProps {
  open: boolean
  email: string
  gestorEmail: string | null
  onAccept: () => void
  onDecline: () => Promise<void>
}

/** Modal de convite quando o e-mail já foi liberado pelo gestor em Cadastros. */
export function TeamEmailRecognizedModal({
  open,
  email,
  gestorEmail,
  onAccept,
  onDecline,
}: TeamEmailRecognizedModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return
      }}
      disableEscapeKeyDown
      slots={{ transition: Fade }}
      slotProps={{
        transition: { timeout: 320 },
        backdrop: {
          sx: {
            backgroundColor: 'rgba(6, 24, 18, 0.55)',
            backdropFilter: 'blur(8px)',
          },
        },
        paper: {
          sx: {
            m: 2,
            maxWidth: 440,
            width: '100%',
            overflow: 'hidden',
            borderRadius: 4,
            border: '1px solid rgba(34, 197, 94, 0.35)',
            background:
              'linear-gradient(165deg, #064E3B 0%, #047857 42%, #10B981 100%)',
            boxShadow:
              '0 24px 64px rgba(4, 120, 87, 0.45), 0 0 0 1px rgba(255,255,255,0.08) inset',
            animation: `${floatIn} 0.4s cubic-bezier(0.22, 1, 0.36, 1)`,
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          px: 3.5,
          pt: 4,
          pb: 3.5,
          textAlign: 'center',
          color: '#ECFDF5',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,0.22), transparent 55%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: 88,
            height: 88,
            mx: 'auto',
            mb: 2.5,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(236, 253, 245, 0.45)',
              animation: `${pulseRing} 1.8s ease-out infinite`,
            }}
          />
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(236, 253, 245, 0.18)',
              border: '1px solid rgba(236, 253, 245, 0.35)',
              boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
            }}
          >
            <PersonAddAlt1RoundedIcon sx={{ fontSize: 40, color: '#ECFDF5' }} />
          </Box>
        </Box>

        <Typography
          variant="overline"
          sx={{
            letterSpacing: '0.16em',
            fontWeight: 700,
            color: 'rgba(236, 253, 245, 0.75)',
            display: 'block',
            mb: 1,
          }}
        >
          Convite do gestor
        </Typography>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            mb: 1.5,
            color: '#FFFFFF',
          }}
        >
          Você já faz parte do sistema
        </Typography>

        <Typography
          sx={{
            fontSize: '0.95rem',
            lineHeight: 1.55,
            color: 'rgba(236, 253, 245, 0.92)',
            mb: 1.5,
          }}
        >
          O gestor abaixo cadastrou o seu e-mail para integrar o AcompSOLEMP:
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            mb: 2.5,
          }}
        >
          <Box
            sx={{
              px: 1.75,
              py: 1,
              borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.18)',
              border: '1px solid rgba(255,255,255,0.16)',
              textAlign: 'left',
            }}
          >
            <Typography sx={{ fontSize: '0.72rem', opacity: 0.75, mb: 0.35, fontWeight: 700 }}>
              Gestor que cadastrou
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', wordBreak: 'break-all' }}>
              {gestorEmail || 'E-mail do gestor indisponível'}
            </Typography>
          </Box>
          <Box
            sx={{
              px: 1.75,
              py: 1,
              borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.12)',
              border: '1px solid rgba(255,255,255,0.12)',
              textAlign: 'left',
            }}
          >
            <Typography sx={{ fontSize: '0.72rem', opacity: 0.75, mb: 0.35, fontWeight: 700 }}>
              Seu e-mail
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', wordBreak: 'break-all' }}>
              {email}
            </Typography>
          </Box>
        </Box>

        <Typography
          sx={{
            fontSize: '0.86rem',
            color: 'rgba(236, 253, 245, 0.8)',
            mb: 2.5,
            lineHeight: 1.5,
          }}
        >
          <strong>Aceitar</strong> — entra na Timeline dessa organização.
          <br />
          <strong>Não fazer parte</strong> — remove seu e-mail do cadastro do gestor para você
          poder criar o próprio banco de dados (Portal do Gestor).
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
            {error}
          </Alert>
        )}

        <Stack spacing={1.25}>
          <Button
            fullWidth
            size="large"
            disabled={loading}
            onClick={onAccept}
            startIcon={<CheckCircleRoundedIcon />}
            sx={{
              py: 1.35,
              borderRadius: 2.5,
              fontWeight: 800,
              textTransform: 'none',
              fontSize: '1rem',
              color: '#065F46',
              bgcolor: '#ECFDF5',
              boxShadow: '0 10px 28px rgba(0,0,0,0.2)',
              '&:hover': {
                bgcolor: '#FFFFFF',
                boxShadow: '0 14px 32px rgba(0,0,0,0.28)',
              },
            }}
          >
            Aceitar e continuar
          </Button>
          <Button
            fullWidth
            size="large"
            disabled={loading}
            onClick={() => void handleDecline()}
            sx={{
              py: 1.25,
              borderRadius: 2.5,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.95rem',
              color: '#ECFDF5',
              border: '1px solid rgba(236, 253, 245, 0.45)',
              bgcolor: 'rgba(0,0,0,0.12)',
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.22)',
                borderColor: 'rgba(236, 253, 245, 0.7)',
              },
            }}
          >
            {loading ? 'Removendo...' : 'Não fazer parte'}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  )
}
