import { Box, Button, Typography, keyframes } from '@mui/material'
import GetAppRoundedIcon from '@mui/icons-material/GetAppRounded'
import DesktopWindowsRoundedIcon from '@mui/icons-material/DesktopWindowsRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { BrandLogo } from '@/components/common/BrandLogo'
import { premiumTokens } from '@/theme/tokens'
import { usePwaInstall } from '@/hooks/usePwaInstall'

const floatIn = keyframes`
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(63, 107, 86, 0.35), 0 18px 40px rgba(63, 107, 86, 0.28); }
  50% { box-shadow: 0 0 0 12px rgba(63, 107, 86, 0), 0 18px 40px rgba(63, 107, 86, 0.28); }
`

/**
 * Tela exclusiva de instalação PWA (navegador / IP). Sem formulário de login.
 */
export function PwaInstallGate() {
  const { install, hint, canInstall, installed } = usePwaInstall()

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
          mb: 1,
        }}
      >
        {installed ? 'AcompSolemp instalado' : 'Instale o AcompSolemp'}
      </Typography>

      {installed && (
        <Typography
          sx={{
            color: 'rgba(29,29,31,0.62)',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            maxWidth: 340,
            mx: 'auto',
            mb: 3,
          }}
        >
          Abra o atalho na área de trabalho ou no menu Iniciar para entrar no sistema.
        </Typography>
      )}
      {!installed && <Box sx={{ mb: 3 }} />}

      {!installed && (
        <Button
          fullWidth
          size="large"
          variant="contained"
          startIcon={<GetAppRoundedIcon />}
          onClick={() => void install()}
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
          {canInstall ? 'Instalar agora' : 'Instalar na área de trabalho'}
        </Button>
      )}

      {hint && (
        <Typography
          sx={{
            mt: 2,
            px: 1,
            fontSize: '0.82rem',
            lineHeight: 1.45,
            color: installed || canInstall ? premiumTokens.primaryDark : 'rgba(29,29,31,0.55)',
          }}
        >
          {hint}
        </Typography>
      )}

      {!installed && (
        <Typography
          sx={{
            mt: 2.5,
            fontSize: '0.75rem',
            color: 'rgba(29,29,31,0.4)',
            letterSpacing: '0.01em',
          }}
        >
          Após instalar, use o atalho do Desktop para entrar.
        </Typography>
      )}
    </Box>
  )
}
