import { Card, CardActionArea, CardContent, Typography, Box, alpha, useTheme } from '@mui/material'
import type { ReactNode } from 'react'
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
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: '0.02em' }}
        >
          {title}
        </Typography>
        {icon && (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: `${premiumTokens.radiusSm}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(accent, 0.12),
              color: accent,
              border: `1px solid ${alpha(accent, 0.2)}`,
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, letterSpacing: '-0.02em' }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
      {trend && (
        <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
          {trend}
        </Typography>
      )}
    </CardContent>
  )

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: premiumTokens.shadow,
          borderColor: premiumTokens.borderStrong,
        },
      }}
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
