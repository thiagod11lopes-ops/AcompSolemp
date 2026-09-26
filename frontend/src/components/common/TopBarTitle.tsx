import { Box, Typography } from '@mui/material'
import { usePageTitleContext } from '@/contexts/PageTitleContext'

interface TopBarTitleProps {
  fallback?: string
  fallbackSubtitle?: string
  /** Exibe também no mobile (útil na topbar densa da clínica). */
  showOnMobile?: boolean
}

/** Título da página na barra superior (substituindo o rótulo fixo do portal). */
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
        variant="h6"
        noWrap
        component="div"
        sx={{
          fontWeight: 700,
          letterSpacing: '-0.025em',
          lineHeight: 1.25,
          fontSize: displaySubtitle ? '1rem' : undefined,
        }}
      >
        {display}
      </Typography>
      {displaySubtitle ? (
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ display: 'block', letterSpacing: '-0.01em', lineHeight: 1.3 }}
        >
          {displaySubtitle}
        </Typography>
      ) : null}
    </Box>
  )
}
