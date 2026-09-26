import { Box, Typography } from '@mui/material'
import { usePageTitleContext } from '@/contexts/PageTitleContext'
import { premiumTokens } from '@/theme/tokens'

interface TopBarTitleProps {
  fallback?: string
  fallbackSubtitle?: string
  /** Exibe também no mobile (útil na topbar densa da clínica). */
  showOnMobile?: boolean
}

/** Título da página na barra superior — mesmo padrão tipográfico do logotipo. */
export function TopBarTitle({
  fallback = '',
  fallbackSubtitle,
  showOnMobile = false,
}: TopBarTitleProps) {
  const { title, subtitle } = usePageTitleContext()
  const hasPageTitle = Boolean(title.trim())
  const display = hasPageTitle ? title.trim() : fallback
  const displaySubtitle = hasPageTitle ? subtitle : fallbackSubtitle

  if (!display) return <Box sx={{ flexGrow: 1 }} />

  return (
    <Box
      sx={{
        flexGrow: 1,
        minWidth: 0,
        mr: 1,
        display: showOnMobile ? 'block' : { xs: 'none', sm: 'block' },
      }}
    >
      <Typography
        noWrap
        component="div"
        sx={{
          fontWeight: 800,
          fontSize: displaySubtitle ? '1.05rem' : '1.1rem',
          letterSpacing: '-0.03em',
          lineHeight: 1.2,
          color: premiumTokens.primaryDark,
          textShadow: '0 1px 2px rgba(0,0,0,0.12)',
        }}
      >
        {display}
      </Typography>
      {displaySubtitle ? (
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{
            display: 'block',
            letterSpacing: '-0.01em',
            mt: 0.1,
            lineHeight: 1.2,
          }}
        >
          {displaySubtitle}
        </Typography>
      ) : null}
    </Box>
  )
}
