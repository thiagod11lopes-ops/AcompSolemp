import { Box, Button, Dialog, Fade, Typography, keyframes } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'

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
  onClose: () => void
}

/** Modal de confirmação quando o e-mail já foi liberado pelo gestor em Cadastros. */
export function TeamEmailRecognizedModal({
  open,
  email,
  onClose,
}: TeamEmailRecognizedModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Fade}
      transitionDuration={320}
      PaperProps={{
        sx: {
          m: 2,
          maxWidth: 420,
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
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(6, 24, 18, 0.55)',
            backdropFilter: 'blur(8px)',
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
            <CheckCircleRoundedIcon sx={{ fontSize: 40, color: '#ECFDF5' }} />
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
          E-mail reconhecido
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
            fontSize: '0.98rem',
            lineHeight: 1.55,
            color: 'rgba(236, 253, 245, 0.92)',
            mb: 1,
          }}
        >
          O gestor cadastrou você para integrar o AcompSOLEMP com o e-mail:
        </Typography>

        <Box
          sx={{
            display: 'inline-block',
            px: 1.75,
            py: 0.85,
            mb: 2.5,
            borderRadius: 2,
            bgcolor: 'rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.16)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.95rem',
              wordBreak: 'break-all',
              color: '#FFFFFF',
            }}
          >
            {email}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontSize: '0.88rem',
            color: 'rgba(236, 253, 245, 0.78)',
            mb: 3,
            lineHeight: 1.5,
          }}
        >
          Defina ou informe sua senha e entre — você será direcionado à Timeline da
          organização, sem criar um novo Portal do Gestor.
        </Typography>

        <Button
          fullWidth
          size="large"
          onClick={onClose}
          sx={{
            py: 1.35,
            borderRadius: 2.5,
            fontWeight: 800,
            textTransform: 'none',
            fontSize: '1rem',
            color: '#065F46',
            bgcolor: '#ECFDF5',
            boxShadow: '0 10px 28px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              bgcolor: '#FFFFFF',
              boxShadow: '0 14px 32px rgba(0,0,0,0.28)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          Continuar
        </Button>
      </Box>
    </Dialog>
  )
}
