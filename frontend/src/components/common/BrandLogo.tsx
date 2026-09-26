import { Box, Typography } from '@mui/material'
import CorporateFareRoundedIcon from '@mui/icons-material/CorporateFareRounded'
import { premiumTokens } from '@/theme/tokens'

interface BrandLogoProps {
  subtitle?: string
  compact?: boolean
}

/** Logotipo AcompSOLEMP — marca com ícone de organização; wordmark limpo. */
export function BrandLogo({ subtitle, compact = false }: BrandLogoProps) {
  const markSize = compact ? 28 : 32

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 1 : 1.15,
        minWidth: 0,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: markSize,
          height: markSize,
          flexShrink: 0,
          borderRadius: '9px',
          background: `linear-gradient(145deg, ${premiumTokens.primaryLight} 0%, ${premiumTokens.primary} 55%, ${premiumTokens.primaryDark} 100%)`,
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.28),
            0 1px 0 rgba(0,0,0,0.06),
            0 4px 10px rgba(63, 107, 86, 0.28)
          `,
          display: 'grid',
          placeItems: 'center',
          color: '#FFFFFF',
        }}
      >
        <CorporateFareRoundedIcon sx={{ fontSize: compact ? 18 : 20 }} />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="div"
          sx={{
            fontWeight: 800,
            fontSize: compact ? '0.95rem' : '1.05rem',
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            color: premiumTokens.primaryDark,
            textShadow: '0 1px 2px rgba(0,0,0,0.12)',
            userSelect: 'none',
          }}
        >
          AcompSOLEMP
        </Typography>
        {subtitle ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              letterSpacing: '-0.01em',
              mt: 0.1,
              lineHeight: 1.2,
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}
