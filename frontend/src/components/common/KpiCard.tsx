import { Card, CardActionArea, CardContent, Typography, Box, alpha, useTheme } from '@mui/material'
import type { ReactNode } from 'react'
import {
  dashboardCardIconOffsetSx,
  dashboardCardShellSx,
  dashboardCardTitleSx,
} from '@/components/dashboard/dashboardCardStyles'
import { premiumTokens } from '@/theme/tokens'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  color?: string
  trend?: string
  onClick?: () => void
  /** Menos altura, para caber vários indicadores na mesma tela. */
  dense?: boolean
}

export function KpiCard({ title, value, subtitle, icon, color, trend, onClick, dense }: KpiCardProps) {
  const theme = useTheme()
  const accent = color ?? theme.palette.primary.main

  const content = (
    <CardContent
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...(dense ? { py: 1, px: 1.25, '&:last-child': { pb: 1 } } : null),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: dense ? 0.75 : 1.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={dense ? { ...dashboardCardTitleSx, fontSize: '0.72rem' } : dashboardCardTitleSx}>
            {title}
          </Typography>
          <Typography
            variant={dense ? 'h6' : 'h4'}
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.03em',
              mt: dense ? 0.25 : 0.75,
              mb: dense ? 0 : 0.5,
              color: premiumTokens.primaryDark,
              ...(dense
                ? { fontSize: '0.95rem', lineHeight: 1.15, whiteSpace: 'nowrap' }
                : null),
            }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
              {trend}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              width: dense ? 28 : 40,
              height: dense ? 28 : 40,
              borderRadius: `${premiumTokens.radiusSm}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(accent, 0.14),
              color: accent,
              border: `1px solid ${alpha(accent, 0.28)}`,
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(63, 107, 86, 0.12)',
              ...(dense ? { '& svg': { fontSize: 16 } } : dashboardCardIconOffsetSx),
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
    </CardContent>
  )

  return (
    <Card
      sx={
        dense
          ? { ...dashboardCardShellSx, '&:hover': { transform: 'none', boxShadow: dashboardCardShellSx.boxShadow } }
          : dashboardCardShellSx
      }
    >
      {onClick ? (
        <CardActionArea
          onClick={onClick}
          sx={{ height: '100%', alignItems: 'stretch' }}
          aria-label={`${title} — ver detalhes`}
        >
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  )
}
