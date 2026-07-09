import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { premiumTokens } from '@/theme/tokens'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  titleAdornment?: ReactNode
}

export function PageHeader({ title, subtitle, action, titleAdornment }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        mb: 3,
        pb: 2.5,
        borderBottom: `1px solid ${premiumTokens.border}`,
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: subtitle ? 0.5 : 0 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            {title}
          </Typography>
          {titleAdornment}
        </Box>
        {subtitle && (
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  )
}
