import { useEffect, useState } from 'react'
import { Box, Typography, keyframes } from '@mui/material'
import CorporateFareRoundedIcon from '@mui/icons-material/CorporateFareRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { premiumTokens } from '@/theme/tokens'

const ringExpand = keyframes`
  0% { transform: scale(0.4); opacity: 0.7; }
  100% { transform: scale(2.2); opacity: 0; }
`

const iconDrop = keyframes`
  0% { transform: translateY(-72px) scale(0.55) rotate(-12deg); opacity: 0; }
  55% { transform: translateY(6px) scale(1.08) rotate(2deg); opacity: 1; }
  75% { transform: translateY(-4px) scale(0.97) rotate(-1deg); }
  100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
`

const deskRise = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
`

const barFill = keyframes`
  from { width: 0%; }
  to { width: 100%; }
`

const checkPop = keyframes`
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`

const spark = keyframes`
  0% { transform: translate(0, 0) scale(0); opacity: 0; }
  40% { opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0; }
`

const SPARKS = [
  { dx: '-48px', dy: '-36px', delay: '0.15s', color: premiumTokens.primaryLight },
  { dx: '52px', dy: '-40px', delay: '0.22s', color: premiumTokens.orange },
  { dx: '-56px', dy: '8px', delay: '0.3s', color: premiumTokens.green },
  { dx: '58px', dy: '12px', delay: '0.18s', color: premiumTokens.primary },
  { dx: '0px', dy: '-58px', delay: '0.28s', color: premiumTokens.yellow },
  { dx: '-28px', dy: '42px', delay: '0.35s', color: premiumTokens.primaryLight },
  { dx: '30px', dy: '44px', delay: '0.4s', color: premiumTokens.orange },
] as const

/**
 * Animação de criação do atalho na área de trabalho após instalar o PWA.
 */
export function PwaInstallSuccessAnimation() {
  const [stage, setStage] = useState<'placing' | 'done'>('placing')

  useEffect(() => {
    const t = window.setTimeout(() => setStage('done'), 2100)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <Box sx={{ py: 0.5, textAlign: 'center' }}>
      <Box
        sx={{
          position: 'relative',
          height: 168,
          mb: 1.5,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {/* Anéis de energia */}
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            aria-hidden
            sx={{
              position: 'absolute',
              left: '50%',
              top: '42%',
              width: 64,
              height: 64,
              ml: '-32px',
              mt: '-32px',
              borderRadius: '50%',
              border: `2px solid ${premiumTokens.primary}`,
              animation: `${ringExpand} 1.6s ease-out ${i * 0.35}s both`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Partículas */}
        {SPARKS.map((s, i) => (
          <Box
            key={i}
            aria-hidden
            sx={{
              position: 'absolute',
              left: '50%',
              top: '42%',
              width: 8,
              height: 8,
              ml: '-4px',
              mt: '-4px',
              borderRadius: '50%',
              bgcolor: s.color,
              ['--dx' as string]: s.dx,
              ['--dy' as string]: s.dy,
              animation: `${spark} 1.1s ease-out ${s.delay} both`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Silhueta da área de trabalho */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            bottom: 0,
            width: '88%',
            maxWidth: 280,
            height: 72,
            borderRadius: '14px 14px 10px 10px',
            background: `
              linear-gradient(180deg, rgba(85,139,113,0.12), rgba(245,245,247,0.9) 40%, #E8E8ED)
            `,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 24px rgba(0,0,0,0.06)',
            animation: `${deskRise} 0.55s cubic-bezier(0.22, 1, 0.36, 1) both`,
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(rgba(63,107,86,0.08) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
              opacity: 0.7,
            },
          }}
        />

        {/* Ícone caindo no desktop */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            mb: 2.2,
            width: 64,
            height: 64,
            borderRadius: '16px',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            background: `linear-gradient(145deg, ${premiumTokens.primaryLight}, ${premiumTokens.primaryDark})`,
            boxShadow: `
              inset 0 1px 0 rgba(255,255,255,0.3),
              0 14px 32px rgba(63, 107, 86, 0.4)
            `,
            animation: `${iconDrop} 1.05s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both`,
          }}
        >
          <CorporateFareRoundedIcon sx={{ fontSize: 32 }} />
          {stage === 'done' && (
            <Box
              sx={{
                position: 'absolute',
                right: -6,
                bottom: -6,
                width: 26,
                height: 26,
                borderRadius: '50%',
                bgcolor: premiumTokens.green,
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                border: '2px solid #fff',
                animation: `${checkPop} 0.45s cubic-bezier(0.22, 1, 0.36, 1) both`,
                boxShadow: '0 4px 12px rgba(48, 209, 88, 0.45)',
              }}
            >
              <CheckRoundedIcon sx={{ fontSize: 16 }} />
            </Box>
          )}
        </Box>
      </Box>

      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.78rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: premiumTokens.primary,
          mb: 1,
          animation: `${fadeUp} 0.45s ease both`,
        }}
      >
        {stage === 'placing' ? 'Criando atalho…' : 'Atalho na área de trabalho'}
      </Typography>

      <Box
        sx={{
          mx: 'auto',
          mb: 2,
          width: '70%',
          height: 6,
          borderRadius: 99,
          bgcolor: 'rgba(63, 107, 86, 0.12)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            borderRadius: 99,
            background: `linear-gradient(90deg, ${premiumTokens.primaryLight}, ${premiumTokens.green})`,
            animation: `${barFill} 1.9s cubic-bezier(0.4, 0, 0.2, 1) both`,
          }}
        />
      </Box>

      <Typography
        component="h2"
        sx={{
          fontWeight: 800,
          fontSize: '1.45rem',
          letterSpacing: '-0.04em',
          color: premiumTokens.primaryDark,
          mb: 0.75,
          animation: `${fadeUp} 0.5s ease 0.35s both`,
        }}
      >
        Instalado com sucesso
      </Typography>

      <Typography
        sx={{
          color: 'rgba(29,29,31,0.58)',
          fontSize: '0.92rem',
          lineHeight: 1.5,
          maxWidth: 300,
          mx: 'auto',
          mb: 2.5,
          animation: `${fadeUp} 0.5s ease 0.5s both`,
        }}
      >
        Abra o atalho <strong>AcompSolemp</strong> na área de trabalho para entrar no sistema.
      </Typography>
    </Box>
  )
}
