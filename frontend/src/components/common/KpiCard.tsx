import { Card, CardContent, Typography, Box, alpha, useTheme } from '@mui/material'
import type { ReactNode } from 'react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  color?: string
  trend?: string
}

export function KpiCard({ title, value, subtitle, icon, color, trend }: KpiCardProps) {
  const theme = useTheme()
  const accent = color ?? theme.palette.primary.main

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {icon && (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(accent, 0.12),
                color: accent,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
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
    </Card>
  )
}
