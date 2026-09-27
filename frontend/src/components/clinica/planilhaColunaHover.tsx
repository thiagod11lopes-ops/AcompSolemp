import { Box } from '@mui/material'
import { useEffect, useState, type ReactNode } from 'react'

/** Hover que dobra a largura da coluna no modo expandido. */
export function usePlanilhaColunaHover(expanded: boolean) {
  const [hoveredColKey, setHoveredColKey] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded) setHoveredColKey(null)
  }, [expanded])

  const resolveColWidth = (key: string, baseWidth: number) =>
    expanded && hoveredColKey === key ? baseWidth * 2 : baseWidth

  const isColHovered = (key: string) => expanded && hoveredColKey === key

  const colHoverHandlers = (key: string) =>
    expanded
      ? {
          onMouseEnter: () => setHoveredColKey(key),
          onMouseLeave: () => setHoveredColKey(null),
        }
      : {}

  return { hoveredColKey, resolveColWidth, isColHovered, colHoverHandlers }
}

/** Conteúdo da célula no modo expandido: truncado em 2 linhas, completo no hover da coluna. */
export function PlanilhaExpandedCellContent({
  children,
  showFull,
}: {
  children: ReactNode
  showFull: boolean
}) {
  return (
    <Box
      sx={{
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        textAlign: 'inherit',
        ...(showFull
          ? null
          : {
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }),
      }}
    >
      {children}
    </Box>
  )
}
