import { useState } from 'react'
import { Box, Button, Typography, keyframes } from '@mui/material'
import GetAppRoundedIcon from '@mui/icons-material/GetAppRounded'
import DesktopWindowsRoundedIcon from '@mui/icons-material/DesktopWindowsRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { BrandLogo } from '@/components/common/BrandLogo'
import { premiumTokens } from '@/theme/tokens'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { PwaInstallModal, phaseFromInstallResult } from '@/components/auth/PwaInstallModal'

const floatIn = keyframes`
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(63, 107, 86, 0.35), 0 18px 40px rgba(63, 107, 86, 0.28); }
  50% { box-shadow: 0 0 0 12px rgba(63, 107, 86, 0), 0 18px 40px rgba(63, 107, 86, 0.28); }
`

type ModalPhase = 'install' | 'manual' | 'success' | 'insecure'

/**
 * Tela exclusiva de instalação PWA (navegador / IP). Sem formulário de login.
 */
export function PwaInstallGate() {
  const { install, canInstall, installed, markInstalled } = usePwaInstall()
  const [modalOpen, setModalOpen] = useState(false)
  const [phase, setPhase] = useState<ModalPhase>('install')
  const [installing, setInstalling] = useState(false)

  const openModal = () => {
    setPhase(installed ? 'success' : 'install')
    setModalOpen(true)
  }

  const handleConfirmInstall = async () => {
    if (phase === 'manual' && !canInstall) {
      markInstalled()
      setPhase('success')
      return
    }
    setInstalling(true)
    try {
      const result = await install()
      setPhase(phaseFromInstallResult(result))
    } finally {
      setInstalling(false)
    }
  }

  return (
    <Box
      sx={{
        animation: `${floatIn} 0.55s cubic-bezier(0.22, 1, 0.36, 1)`,
        textAlign: 'center',
        py: { xs: 0.5, sm: 1 },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <BrandLogo subtitle="Gestão de Materiais Consignados" />
      </Box>

      <Box
        aria-hidden
        sx={{
          mx: 'auto',
          mb: 2.5,
          width: 72,
          height: 72,
          borderRadius: '22px',
          display: 'grid',
          placeItems: 'center',
          background: installed
            ? `linear-gradient(145deg, ${premiumTokens.green}, ${premiumTokens.primaryDark})`
            : `linear-gradient(145deg, ${premiumTokens.primaryLight}, ${premiumTokens.primaryDark})`,
          color: '#fff',
          animation: installed ? 'none' : `${pulseGlow} 2.8s ease-in-out infinite`,
        }}
      >
        {installed ? (
          <CheckCircleRoundedIcon sx={{ fontSize: 36 }} />
        ) : (
          <DesktopWindowsRoundedIcon sx={{ fontSize: 34 }} />
        )}
      </Box>

      <Typography
        component="h1"
        sx={{
          fontWeight: 800,
          fontSize: { xs: '1.45rem', sm: '1.65rem' },
          letterSpacing: '-0.04em',
          lineHeight: 1.15,
          color: premiumTokens.primaryDark,
          mb: 3,
        }}
      >
        {installed ? 'AcompSolemp instalado' : 'Instale o AcompSolemp'}
      </Typography>

      {installed ? (
        <Typography
          sx={{
            color: 'rgba(29,29,31,0.62)',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            maxWidth: 340,
            mx: 'auto',
          }}
        >
          Abra o atalho na área de trabalho ou no menu Iniciar para entrar no sistema.
        </Typography>
      ) : (
        <Button
          fullWidth
          size="large"
          variant="contained"
          startIcon={<GetAppRoundedIcon />}
          onClick={openModal}
          sx={{
            py: 1.55,
            borderRadius: '14px',
            fontWeight: 800,
            fontSize: '1rem',
            letterSpacing: '-0.02em',
            textTransform: 'none',
            background: `linear-gradient(135deg, ${premiumTokens.primary} 0%, ${premiumTokens.primaryDark} 100%)`,
            boxShadow: '0 12px 28px rgba(63, 107, 86, 0.32)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              background: `linear-gradient(135deg, ${premiumTokens.primaryLight} 0%, ${premiumTokens.primary} 100%)`,
              boxShadow: '0 16px 36px rgba(63, 107, 86, 0.4)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          Instalar na área de trabalho
        </Button>
      )}

      <PwaInstallModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        canInstall={canInstall}
        installing={installing}
        phase={phase}
        onConfirmInstall={() => void handleConfirmInstall()}
      />
    </Box>
  )
}
