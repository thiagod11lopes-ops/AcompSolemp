import { Box } from '@mui/material'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

type ColDef = { key: string; width: number }

/**
 * Larguras percentuais que sempre somam 100% do espaço disponível
 * (reserva seleção/ações), para caber sem rolagem horizontal.
 * Hover que dobra a coluna só no modo expandido.
 */
export function usePlanilhaColunaHover(
  expanded: boolean,
  columns: readonly ColDef[],
  options: { selectionEnabled?: boolean; actionsEnabled?: boolean; descricaoKey?: string } = {},
) {
  const [hoveredColKey, setHoveredColKey] = useState<string | null>(null)
  const selectionEnabled = Boolean(options.selectionEnabled)
  const actionsEnabled = Boolean(options.actionsEnabled)
  const descricaoKey = options.descricaoKey

  useEffect(() => {
    if (!expanded) setHoveredColKey(null)
  }, [expanded])

  const layout = useMemo(() => {
    const selectionPct = selectionEnabled ? 2.8 : 0
    const actionsPct = actionsEnabled ? 3.2 : 0
    const dataPct = Math.max(0, 100 - selectionPct - actionsPct)

    const weights = columns.map((col) => {
      const base =
        descricaoKey && col.key === descricaoKey
          ? Math.max(col.width, 220)
          : col.width
      return {
        key: col.key,
        weight: expanded && hoveredColKey === col.key ? base * 2 : base,
      }
    })
    const sum = weights.reduce((acc, item) => acc + item.weight, 0) || 1
    const percents: Record<string, string> = {}
    for (const item of weights) {
      percents[item.key] = `${((item.weight / sum) * dataPct).toFixed(3)}%`
    }

    return {
      selectionWidth: selectionEnabled ? `${selectionPct}%` : undefined,
      actionsWidth: actionsEnabled ? `${actionsPct}%` : undefined,
      percents,
    }
  }, [actionsEnabled, columns, descricaoKey, expanded, hoveredColKey, selectionEnabled])

  const resolveColWidth = (key: string, _fallbackWidth?: number): string =>
    layout.percents[key] ?? 'auto'

  const isColHovered = (key: string) => expanded && hoveredColKey === key

  const colHoverHandlers = (key: string) =>
    expanded
      ? {
          onMouseEnter: () => setHoveredColKey(key),
          onMouseLeave: () => setHoveredColKey(null),
        }
      : {}

  return {
    hoveredColKey,
    resolveColWidth,
    isColHovered,
    colHoverHandlers,
    selectionWidth: layout.selectionWidth,
    actionsWidth: layout.actionsWidth,
  }
}

/** Conteúdo da célula: truncado em 2 linhas; completo no hover (modo expandido). */
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
        minWidth: 0,
        maxWidth: '100%',
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
