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
    max = Math.max(max, measureTextPx(text || '—', font))
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

    const bases = columns.map((col) => {
      const base =
        descricaoKey && col.key === descricaoKey
          ? Math.max(col.width, 220)
          : col.width
      return { key: col.key, base }
    })
    const baseSum = bases.reduce((acc, item) => acc + item.base, 0) || 1
    const percents: Record<string, string> = {}

    if (hoveredColKey) {
      const font = `${fontWeight} ${fontSizePx}px ${EXCEL_SHEET.fontFamily}`
      const neededPx = maxContentWidthPx(cellTextsByKey?.[hoveredColKey], font)
      const hoveredBase =
        bases.find((b) => b.key === hoveredColKey)?.base ?? baseSum / Math.max(columns.length, 1)
      const baseSharePx = (hoveredBase / baseSum) * availablePx
      // Largura em px até caber o texto (máx. ~92% da área de dados)
      const fitPx = Math.round(
        Math.min(availablePx * 0.92, Math.max(neededPx, baseSharePx, 48)),
      )
      const othersSum =
        bases.filter((b) => b.key !== hoveredColKey).reduce((a, b) => a + b.base, 0) || 1

      for (const item of bases) {
        if (item.key === hoveredColKey) {
          percents[item.key] = `${fitPx}px`
        } else {
          const frac = item.base / othersSum
          percents[item.key] =
            `calc((100% - ${reservedPx + fitPx}px) * ${frac.toFixed(5)})`
        }
      }
    } else {
      for (const item of bases) {
        const fraction = item.base / baseSum
        percents[item.key] =
          reservedPx > 0
            ? `calc((100% - ${reservedPx}px) * ${fraction.toFixed(5)})`
            : `${(fraction * 100).toFixed(3)}%`
      }
    }

    return {
      selectionWidth: selectionEnabled ? `${selectionPx}px` : undefined,
      actionsWidth: actionsEnabled ? `${actionsPx}px` : undefined,
      percents,
    }
  }, [
    actionsEnabled,
    cellTextsByKey,
    columns,
    descricaoKey,
    fontSizePx,
    fontWeight,
    hoveredColKey,
    selectionEnabled,
    tableWidthPx,
  ])

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
 * Conteúdo da célula em uma linha: reticências quando truncado;
 * no hover a coluna alarga e o texto completo aparece sem quebra.
 */
export function PlanilhaExpandedCellContent({
  children,
  showFull,
}: {
  children: ReactNode
  showFull: boolean
  /** @deprecated Sempre nowrap — mantido por compatibilidade. */
  nowrap?: boolean
}) {
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
