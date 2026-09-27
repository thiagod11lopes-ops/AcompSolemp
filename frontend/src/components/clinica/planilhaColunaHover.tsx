import { Box } from '@mui/material'
import { useMemo, useState, type ReactNode } from 'react'

type ColDef = { key: string; width: number }

/**
 * Larguras percentuais que sempre somam 100% do espaço disponível
 * (reserva seleção/ações), para caber sem rolagem horizontal.
 * Hover dobra a coluna (modo expandido e recolhido).
 */
export function usePlanilhaColunaHover(
  columns: readonly ColDef[],
  options: { selectionEnabled?: boolean; actionsEnabled?: boolean; descricaoKey?: string } = {},
) {
  const [hoveredColKey, setHoveredColKey] = useState<string | null>(null)
  const selectionEnabled = Boolean(options.selectionEnabled)
  const actionsEnabled = Boolean(options.actionsEnabled)
  const descricaoKey = options.descricaoKey

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
        weight: hoveredColKey === col.key ? base * 2 : base,
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
  }, [actionsEnabled, columns, descricaoKey, hoveredColKey, selectionEnabled])

  const resolveColWidth = (key: string, _fallbackWidth?: number): string =>
    layout.percents[key] ?? 'auto'

  const isColHovered = (key: string) => hoveredColKey === key

  const colHoverHandlers = (key: string) => ({
    onMouseEnter: () => setHoveredColKey(key),
    onMouseLeave: () => setHoveredColKey(null),
  })

  return {
    hoveredColKey,
    resolveColWidth,
    isColHovered,
    colHoverHandlers,
    selectionWidth: layout.selectionWidth,
    actionsWidth: layout.actionsWidth,
  }
}

/**
 * Conteúdo da célula.
 * - wrap: truncado em 2 linhas; completo no hover (modo expandido).
 * - nowrap: uma linha com reticências; no hover a coluna alarga e revela mais texto.
 */
export function PlanilhaExpandedCellContent({
  children,
  showFull,
  nowrap = false,
}: {
  children: ReactNode
  showFull: boolean
  nowrap?: boolean
}) {
  if (nowrap) {
    return (
      <Box
        sx={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          wordBreak: 'normal',
          overflowWrap: 'normal',
          textAlign: 'inherit',
          minWidth: 0,
          maxWidth: '100%',
        }}
      >
        {children}
      </Box>
    )
  }

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
