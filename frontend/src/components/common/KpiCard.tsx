import { Card, CardActionArea, CardContent, Typography, Box, alpha, useTheme } from '@mui/material'
import type { ReactNode } from 'react'
import {
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
}

export function KpiCard({ title, value, subtitle, icon, color, trend, onClick }: KpiCardProps) {
  const theme = useTheme()
  const accent = color ?? theme.palette.primary.main

  const content = (
    <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={dashboardCardTitleSx}>{title}</Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.03em',
              mt: 0.75,
              mb: 0.5,
              color: premiumTokens.primaryDark,
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
              width: 40,
              height: 40,
              borderRadius: `${premiumTokens.radiusSm}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(accent, 0.14),
              color: accent,
              border: `1px solid ${alpha(accent, 0.28)}`,
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(63, 107, 86, 0.12)',
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
    </CardContent>
  )

  return (
    <Card sx={dashboardCardShellSx}>
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
