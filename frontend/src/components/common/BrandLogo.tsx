import { Box, Typography } from '@mui/material'
import { premiumTokens } from '@/theme/tokens'

interface BrandLogoProps {
  subtitle?: string
  compact?: boolean
}

/** Logotipo AcompSOLEMP com wordmark 3D e marca em volume. */
export function BrandLogo({ subtitle, compact = false }: BrandLogoProps) {
  const markSize = compact ? 28 : 34
  const fontSize = compact ? '0.95rem' : '1.05rem'

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 1 : 1.25,
        minWidth: 0,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: markSize,
          height: markSize,
          flexShrink: 0,
          position: 'relative',
          perspective: 120,
          filter: 'drop-shadow(0 6px 10px rgba(63, 107, 86, 0.35))',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: '12% 18% 18% 12%',
            borderRadius: '7px',
            background: `linear-gradient(145deg, ${premiumTokens.primaryLight} 0%, ${premiumTokens.primary} 48%, ${premiumTokens.primaryDark} 100%)`,
            transform: 'rotateX(18deg) rotateY(-28deg) rotateZ(6deg)',
            transformStyle: 'preserve-3d',
            boxShadow: `
              inset 0 1px 0 rgba(255,255,255,0.35),
              inset 0 -2px 4px rgba(0,0,0,0.18),
              4px 6px 0 ${premiumTokens.primaryDark},
              6px 9px 14px rgba(0,0,0,0.22)
            `,
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: '22% 22% 28% 22%',
              borderRadius: '4px',
              border: '1.5px solid rgba(255,255,255,0.55)',
              borderBottomColor: 'rgba(255,255,255,0.15)',
              borderRightColor: 'rgba(255,255,255,0.2)',
            },
          }}
        />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            position: 'relative',
            display: 'inline-block',
            transform: 'perspective(280px) rotateX(10deg)',
            transformOrigin: 'left center',
            userSelect: 'none',
          }}
        >
          {/* Extrusão 3D atrás do wordmark */}
          <Typography
            aria-hidden
            component="span"
            sx={{
              position: 'absolute',
              inset: 0,
              fontWeight: 800,
              fontSize,
              letterSpacing: '-0.04em',
              lineHeight: 1.15,
              color: '#355a49',
              textShadow: `
                1px 1px 0 ${premiumTokens.primaryDark},
                2px 2px 0 ${premiumTokens.primaryDark},
                3px 3px 0 #2f5042,
                4px 5px 0 #2a473b,
                5px 7px 10px rgba(0,0,0,0.28)
              `,
              transform: 'translate(1px, 1px)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            AcompSOLEMP
          </Typography>
          <Typography
            component="span"
            sx={{
              position: 'relative',
              display: 'inline-block',
              fontWeight: 800,
              fontSize,
              letterSpacing: '-0.04em',
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              background: `linear-gradient(180deg, ${premiumTokens.primaryLight} 0%, ${premiumTokens.primary} 45%, ${premiumTokens.primaryDark} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.35))',
            }}
          >
            AcompSOLEMP
          </Typography>
        </Box>
        {subtitle ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              letterSpacing: '-0.01em',
              mt: 0.2,
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
