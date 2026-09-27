import { Box } from '@mui/material'
import { useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'

type ColDef = { key: string; width: number }

/** Largura fixa da coluna Ações (editar + excluir lado a lado). */
export const PLANILHA_ACTIONS_WIDTH_PX = 76
/** Largura fixa da coluna de seleção (checkbox). */
export const PLANILHA_SELECTION_WIDTH_PX = 40

let measureCanvas: HTMLCanvasElement | null = null

function measureTextPx(text: string, font: string): number {
  if (typeof document === 'undefined') return Math.ceil(text.length * 7)
  if (!measureCanvas) measureCanvas = document.createElement('canvas')
  const ctx = measureCanvas.getContext('2d')
  if (!ctx) return Math.ceil(text.length * 7)
  ctx.font = font
  return ctx.measureText(text).width
}

function maxContentWidthPx(
  texts: string[] | undefined,
  font: string,
  paddingPx = 16,
): number {
  if (!texts?.length) return 0
  let max = 0
  for (const text of texts) {
    // Mede a linha mais larga (textos com quebra gramatical usam \n)
    for (const line of String(text || '—').split('\n')) {
      max = Math.max(max, measureTextPx(line || '—', font))
    }
  }
  return Math.ceil(max + paddingPx)
}

export const planilhaActionsCellSx = {
  width: PLANILHA_ACTIONS_WIDTH_PX,
  minWidth: PLANILHA_ACTIONS_WIDTH_PX,
  maxWidth: PLANILHA_ACTIONS_WIDTH_PX,
  whiteSpace: 'nowrap' as const,
  overflow: 'visible' as const,
  textAlign: 'center' as const,
  px: '2px !important',
}

interface UsePlanilhaColunaHoverOptions {
  selectionEnabled?: boolean
  actionsEnabled?: boolean
  descricaoKey?: string
  /** Largura mínima em caracteres (aprox.) por chave de coluna. */
  minCharsByKey?: Record<string, number>
  /** Textos das células por coluna (linhas filtradas) — usado no hover. */
  cellTextsByKey?: Record<string, string[]>
  /** Ref da tabela ou container para medir a largura disponível. */
  tableRef?: RefObject<HTMLElement | null>
  fontSizePx?: number
  fontWeight?: number
}

/**
 * Larguras que somam o espaço disponível (seleção/ações fixas).
 * Hover: alarga a coluna na horizontal até caber todo o conteúdo (sem quebra).
 */
export function usePlanilhaColunaHover(
  columns: readonly ColDef[],
  options: UsePlanilhaColunaHoverOptions = {},
) {
  const [hoveredColKey, setHoveredColKey] = useState<string | null>(null)
  const [tableWidthPx, setTableWidthPx] = useState(0)
  const selectionEnabled = Boolean(options.selectionEnabled)
  const actionsEnabled = Boolean(options.actionsEnabled)
  const descricaoKey = options.descricaoKey
  const minCharsByKey = options.minCharsByKey
  const cellTextsByKey = options.cellTextsByKey
  const tableRef = options.tableRef
  const fontSizePx = options.fontSizePx ?? 11
  const fontWeight = options.fontWeight ?? EXCEL_SHEET.fontWeight

  useEffect(() => {
    const el = tableRef?.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const w = el.clientWidth || el.parentElement?.clientWidth || 0
      setTableWidthPx(Math.round(w))
    }
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)
    measure()
    return () => ro.disconnect()
  }, [tableRef])

  const layout = useMemo(() => {
    const selectionPx = selectionEnabled ? PLANILHA_SELECTION_WIDTH_PX : 0
    const actionsPx = actionsEnabled ? PLANILHA_ACTIONS_WIDTH_PX : 0
    const reservedPx = selectionPx + actionsPx
    const availablePx = Math.max(160, (tableWidthPx || 960) - reservedPx)
    const font = `${fontWeight} ${fontSizePx}px ${EXCEL_SHEET.fontFamily}`

    const minPxByKey: Record<string, number> = {}
    for (const [key, chars] of Object.entries(minCharsByKey ?? {})) {
      if (chars > 0) {
        minPxByKey[key] = Math.ceil(measureTextPx('0'.repeat(chars), font) + 16)
      }
    }

    const bases = columns.map((col) => {
      let base =
        descricaoKey && col.key === descricaoKey
          ? Math.max(col.width, 220)
          : col.width
      const minPx = minPxByKey[col.key]
      if (minPx) {
        // Converte mínimo em px para peso relativo na distribuição
        const minWeight = (minPx / availablePx) * 1000
        base = Math.max(base, minWeight)
      }
      return { key: col.key, base }
    })
    const baseSum = bases.reduce((acc, item) => acc + item.base, 0) || 1
    const percents: Record<string, string> = {}
    const minWidths: Record<string, string | undefined> = {}

    if (hoveredColKey) {
      const neededPx = maxContentWidthPx(cellTextsByKey?.[hoveredColKey], font)
      const hoveredBase =
        bases.find((b) => b.key === hoveredColKey)?.base ?? baseSum / Math.max(columns.length, 1)
      const baseSharePx = (hoveredBase / baseSum) * availablePx
      const minHovered = minPxByKey[hoveredColKey] ?? 0
      const fitPx = Math.round(
        Math.min(
          availablePx * 0.92,
          Math.max(neededPx, baseSharePx, minHovered, 48),
        ),
      )
      const othersSum =
        bases.filter((b) => b.key !== hoveredColKey).reduce((a, b) => a + b.base, 0) || 1

      for (const item of bases) {
        if (item.key === hoveredColKey) {
          percents[item.key] = `${fitPx}px`
          minWidths[item.key] = `${Math.max(fitPx, minHovered)}px`
        } else {
          const frac = item.base / othersSum
          percents[item.key] =
            `calc((100% - ${reservedPx + fitPx}px) * ${frac.toFixed(5)})`
          const minPx = minPxByKey[item.key]
          minWidths[item.key] = minPx ? `${minPx}px` : undefined
        }
      }
    } else {
      // Colunas com mínimo ficam em px (>= N caracteres); as demais rateiam o resto
      const minEntries = bases.filter((b) => minPxByKey[b.key])
      const freeEntries = bases.filter((b) => !minPxByKey[b.key])
      const minTotalPx = minEntries.reduce((a, b) => {
        const share = (b.base / baseSum) * availablePx
        return a + Math.max(minPxByKey[b.key]!, share)
      }, 0)

      if (minEntries.length > 0 && minTotalPx < availablePx - 40 && freeEntries.length > 0) {
        const freeSum = freeEntries.reduce((a, b) => a + b.base, 0) || 1
        let usedMin = 0
        for (const item of minEntries) {
          const share = (item.base / baseSum) * availablePx
          const widthPx = Math.round(Math.max(minPxByKey[item.key]!, share))
          usedMin += widthPx
          percents[item.key] = `${widthPx}px`
          minWidths[item.key] = `${minPxByKey[item.key]}px`
        }
        for (const item of freeEntries) {
          const frac = item.base / freeSum
          percents[item.key] =
            `calc((100% - ${reservedPx + usedMin}px) * ${frac.toFixed(5)})`
          minWidths[item.key] = undefined
        }
      } else {
        for (const item of bases) {
          const fraction = item.base / baseSum
          percents[item.key] =
            reservedPx > 0
              ? `calc((100% - ${reservedPx}px) * ${fraction.toFixed(5)})`
              : `${(fraction * 100).toFixed(3)}%`
          const minPx = minPxByKey[item.key]
          minWidths[item.key] = minPx ? `${minPx}px` : undefined
        }
      }
    }

    return {
      selectionWidth: selectionEnabled ? `${selectionPx}px` : undefined,
      actionsWidth: actionsEnabled ? `${actionsPx}px` : undefined,
      percents,
      minWidths,
    }
  }, [
    actionsEnabled,
    cellTextsByKey,
    columns,
    descricaoKey,
    fontSizePx,
    fontWeight,
    hoveredColKey,
    minCharsByKey,
    selectionEnabled,
    tableWidthPx,
  ])

  const resolveColWidth = (key: string, _fallbackWidth?: number): string =>
    layout.percents[key] ?? 'auto'

  const resolveColMinWidth = (key: string): string | number =>
    layout.minWidths[key] ?? 0

  const isColHovered = (key: string) => hoveredColKey === key

  const colHoverHandlers = (key: string) => ({
    onMouseEnter: () => setHoveredColKey(key),
    onMouseLeave: () => setHoveredColKey(null),
  })

  return {
    hoveredColKey,
    resolveColWidth,
    resolveColMinWidth,
    isColHovered,
    colHoverHandlers,
    selectionWidth: layout.selectionWidth,
    actionsWidth: layout.actionsWidth,
  }
}

/**
 * Conteúdo da célula.
 * - padrão: uma linha com reticências; no hover a coluna alarga.
 * - allowWrap: respeita quebras `\n` (ex.: limite gramatical de 50 chars).
 */
export function PlanilhaExpandedCellContent({
  children,
  showFull,
  allowWrap = false,
}: {
  children: ReactNode
  showFull: boolean
  allowWrap?: boolean
  /** @deprecated Mantido por compatibilidade. */
  nowrap?: boolean
}) {
  if (allowWrap) {
    return (
      <Box
        sx={{
          whiteSpace: 'pre-line',
          overflow: showFull ? 'visible' : 'hidden',
          textOverflow: 'clip',
          wordBreak: 'normal',
          overflowWrap: 'normal',
          textAlign: 'inherit',
          minWidth: 0,
          maxWidth: '100%',
          lineHeight: 1.25,
          ...(showFull
            ? null
            : {
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
              }),
        }}
      >
        {children}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        whiteSpace: 'nowrap',
        overflow: showFull ? 'visible' : 'hidden',
        textOverflow: showFull ? 'clip' : 'ellipsis',
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

/** Ícones de editar/excluir sempre na horizontal, sem empilhar. */
export function PlanilhaActionsButtons({ children }: { children: ReactNode }) {
  return (
    <Box
      className="excel-planilha-actions"
      sx={{
        display: 'inline-flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.15,
        width: '100%',
        minWidth: PLANILHA_ACTIONS_WIDTH_PX - 8,
      }}
    >
      {children}
    </Box>
  )
}
