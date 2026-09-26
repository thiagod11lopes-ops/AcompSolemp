import { Box } from '@mui/material'
import type { ReactNode } from 'react'
import { usePageTitle } from '@/contexts/PageTitleContext'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  titleAdornment?: ReactNode
  /** Mantido por compatibilidade; o título vai para a TopBar. */
  titleVariant?: 'h4' | 'h6'
}

/**
 * Envia título/subtítulo para a barra superior e, se houver, renderiza só as ações
 * no conteúdo da página (sem cabeçalho duplicado).
 */
export function PageHeader({ title, subtitle, action, titleAdornment }: PageHeaderProps) {
  usePageTitle(title, subtitle)

  if (!action && !titleAdornment) return null

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.5,
        mb: 2,
      }}
    >
      {titleAdornment}
      {action}
    </Box>
  )
}
