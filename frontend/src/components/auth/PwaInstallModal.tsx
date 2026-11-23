import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  keyframes,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import GetAppRoundedIcon from '@mui/icons-material/GetAppRounded'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import AppsRoundedIcon from '@mui/icons-material/AppsRounded'
import DesktopWindowsRoundedIcon from '@mui/icons-material/DesktopWindowsRounded'
import { premiumTokens } from '@/theme/tokens'
import type { PwaInstallResult } from '@/hooks/usePwaInstall'
import { PwaInstallSuccessAnimation } from '@/components/auth/PwaInstallSuccessAnimation'

const floatIn = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
`

type Phase = 'install' | 'manual' | 'success' | 'insecure'

interface PwaInstallModalProps {
  open: boolean
  onClose: () => void
  canInstall: boolean
  installing: boolean
  phase: Phase
  onConfirmInstall: () => void
}

const STEPS = [
  { icon: <MoreVertRoundedIcon />, title: 'Menu do navegador', detail: 'Clique no ícone ⋮ no canto superior direito' },
  { icon: <AppsRoundedIcon />, title: 'Instalar aplicativo', detail: 'Escolha Instalar aplicativo ou Instalar AcompSolemp' },
  { icon: <DesktopWindowsRoundedIcon />, title: 'Atalho no Desktop', detail: 'Confirme — o atalho aparece na área de trabalho' },
] as const

export function PwaInstallModal({
  open,
  onClose,
  canInstall,
  installing,
  phase,
  onConfirmInstall,
}: PwaInstallModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(12, 12, 13, 0.55)',
            backdropFilter: 'blur(10px)',
          },
        },
        paper: {
          sx: {
            borderRadius: '22px',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 28px 64px rgba(0,0,0,0.28)',
            background: `
              radial-gradient(ellipse 90% 50% at 50% -10%, rgba(85, 139, 113, 0.18), transparent 55%),
              #FFFFFF
            `,
            animation: `${floatIn} 0.4s cubic-bezier(0.22, 1, 0.36, 1)`,
          },
        },
      }}
    >
      <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
        <IconButton aria-label="Fechar" onClick={onClose} size="small" sx={{ color: 'rgba(0,0,0,0.4)' }}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 4, pb: 3.5, textAlign: 'center' }}>
        {phase === 'success' ? (
          <PwaInstallSuccessAnimation key="install-success" />
        ) : (
          <>
        <Box
          aria-hidden
          sx={{
            mx: 'auto',
            mb: 2,
            width: 76,
            height: 76,
            borderRadius: '24px',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            background: `linear-gradient(145deg, ${premiumTokens.primaryLight}, ${premiumTokens.primaryDark})`,
            animation: phase === 'install' ? `${pulse} 2.4s ease-in-out infinite` : 'none',
            boxShadow: '0 16px 36px rgba(63, 107, 86, 0.3)',
          }}
        >
          <GetAppRoundedIcon sx={{ fontSize: 36 }} />
        </Box>

        <Typography
          component="h2"
          sx={{
            fontWeight: 800,
            fontSize: '1.45rem',
            letterSpacing: '-0.04em',
            color: premiumTokens.primaryDark,
            mb: 0.75,
          }}
        >
          {phase === 'insecure' ? 'Abra em HTTPS' : 'Instalar AcompSolemp'}
        </Typography>

        <Typography
          sx={{
            color: 'rgba(29,29,31,0.58)',
            fontSize: '0.92rem',
            lineHeight: 1.5,
            mb: 2.5,
            maxWidth: 320,
            mx: 'auto',
          }}
        >
          {phase === 'insecure'
            ? 'Use o endereço https:// do servidor (não http://) e tente novamente.'
            : phase === 'manual'
              ? 'Siga os passos abaixo no Chrome ou Edge.'
              : 'Um atalho será criado na área de trabalho.'}
        </Typography>

        {phase === 'manual' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 2.5, textAlign: 'left' }}>
            {STEPS.map((step, index) => (
              <Box
                key={step.title}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'flex-start',
                  p: 1.5,
                  borderRadius: '14px',
                  bgcolor: 'rgba(85, 139, 113, 0.07)',
                  border: '1px solid rgba(85, 139, 113, 0.14)',
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '11px',
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: premiumTokens.primary,
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  {index + 1}
                </Box>
                <Box sx={{ minWidth: 0, pt: 0.15 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: premiumTokens.primaryDark }}>
                    {step.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: 'rgba(29,29,31,0.55)', lineHeight: 1.4 }}>
                    {step.detail}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {phase !== 'insecure' && (
          <Button
            fullWidth
            size="large"
            variant="contained"
            startIcon={<GetAppRoundedIcon />}
            disabled={installing}
            onClick={onConfirmInstall}
            sx={{
              py: 1.45,
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.02em',
              textTransform: 'none',
              background: `linear-gradient(135deg, ${premiumTokens.primary} 0%, ${premiumTokens.primaryDark} 100%)`,
              boxShadow: '0 12px 28px rgba(63, 107, 86, 0.32)',
              '&:hover': {
                background: `linear-gradient(135deg, ${premiumTokens.primaryLight} 0%, ${premiumTokens.primary} 100%)`,
              },
            }}
          >
            {installing
              ? 'Abrindo instalação…'
              : canInstall
                ? 'Instalar agora'
                : 'Já instalei pelo menu'}
          </Button>
        )}

        {phase === 'insecure' && (
          <Button
            fullWidth
            size="large"
            variant="contained"
            onClick={onClose}
            sx={{
              py: 1.35,
              borderRadius: '14px',
              fontWeight: 700,
              textTransform: 'none',
              background: premiumTokens.primary,
            }}
          >
            Fechar
          </Button>
        )}
          </>
        )}

        {phase === 'success' && (
          <Button
            fullWidth
            size="large"
            variant="contained"
            onClick={onClose}
            sx={{
              py: 1.35,
              borderRadius: '14px',
              fontWeight: 700,
              textTransform: 'none',
              background: premiumTokens.primary,
            }}
          >
            Fechar
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function phaseFromInstallResult(result: PwaInstallResult): Phase {
  if (result === 'accepted' || result === 'already-installed') return 'success'
  if (result === 'insecure') return 'insecure'
  if (result === 'needs-manual' || result === 'dismissed' || result === 'unavailable') return 'manual'
  return 'install'
}
