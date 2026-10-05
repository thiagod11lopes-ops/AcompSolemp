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
        ...(dense ? { py: 2.25, px: 2, '&:last-child': { pb: 2.25 } } : null),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: dense ? 1.25 : 1.5 }}>
        <Box sx={{ minWidth: 0, flex: 1, ...(dense ? { containerType: 'inline-size' } : null) }}>
          <Typography sx={dense ? { ...dashboardCardTitleSx, fontSize: '1rem' } : dashboardCardTitleSx}>
            {title}
          </Typography>
          <Typography
            variant={dense ? 'h5' : 'h4'}
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.03em',
              mt: dense ? 0.75 : 0.75,
              mb: dense ? 0 : 0.5,
              color: premiumTokens.primaryDark,
              ...(dense
                ? { fontSize: 'clamp(1rem, 14cqi, 1.7rem)', lineHeight: 1.1, whiteSpace: 'nowrap' }
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
              width: dense ? 48 : 40,
              height: dense ? 48 : 40,
              borderRadius: `${premiumTokens.radiusSm}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(accent, 0.14),
              color: accent,
              border: `1px solid ${alpha(accent, 0.28)}`,
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(63, 107, 86, 0.12)',
              ...(dense ? { '& svg': { fontSize: 26 } } : dashboardCardIconOffsetSx),
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
          ? {
              ...dashboardCardShellSx,
              '&:hover': onClick
                ? { transform: 'translateY(-2px)', boxShadow: '0 12px 28px rgba(63, 107, 86, 0.2)' }
                : { transform: 'none', boxShadow: dashboardCardShellSx.boxShadow },
            }
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
