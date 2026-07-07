import { formatValorBrasileiro, type ConsumoMaterialRow } from '@/utils/consumoMaterialOds'

export const MIN_COL_WIDTH = 48
const CELL_HORIZONTAL_PAD = 32
const SORT_ICON_EXTRA = 22

const FONTS = {
  header: '700 10.88px Roboto, Helvetica, Arial, sans-serif',
  body: '400 14px Roboto, Helvetica, Arial, sans-serif',
  valor: '600 14px "JetBrains Mono", "Roboto Mono", monospace',
  input: '400 12.48px Roboto, Helvetica, Arial, sans-serif',
} as const

let measureCanvas: HTMLCanvasElement | null = null

function getMeasureContext(): CanvasRenderingContext2D {
  if (typeof document === 'undefined') {
    throw new Error('measureColumnWidths requires a browser environment')
  }
  if (!measureCanvas) measureCanvas = document.createElement('canvas')
  const ctx = measureCanvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  return ctx
}

function measureText(text: string, font: string): number {
  const ctx = getMeasureContext()
  ctx.font = font
  return Math.ceil(ctx.measureText(text || ' ').width)
}

function toSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function cellTextForMeasure(row: ConsumoMaterialRow, key: string): string {
  if (key === 'valor' && row.valorNumerico > 0) {
    return formatValorBrasileiro(row.valorNumerico)
  }
  return toSingleLine(String(row[key as keyof ConsumoMaterialRow] ?? ''))
}

export function measureColumnWidths(
  rows: ConsumoMaterialRow[],
  headers: ReadonlyArray<{ key: string; label: string }>,
): Record<string, number> {
  const widths: Record<string, number> = {}

  for (const col of headers) {
    const bodyFont = col.key === 'valor' ? FONTS.valor : FONTS.body
    const inputFont = col.key === 'valor' ? FONTS.valor : FONTS.input
    let maxContent = measureText(col.label, FONTS.header) + SORT_ICON_EXTRA

    for (const row of rows) {
      const text = cellTextForMeasure(row, col.key)
      if (!text) continue
      maxContent = Math.max(maxContent, measureText(text, bodyFont))
      maxContent = Math.max(maxContent, measureText(text, inputFont))
    }

    widths[col.key] = Math.max(MIN_COL_WIDTH, maxContent + CELL_HORIZONTAL_PAD)
  }

  return widths
}

export function resolveColumnWidths(
  contentWidths: Record<string, number>,
  manualOverrides: Record<string, number>,
  selectWidth = 48,
): Record<string, number> {
  const resolved: Record<string, number> = {
    select: Math.max(selectWidth, manualOverrides.select ?? 0),
  }

  for (const [key, contentWidth] of Object.entries(contentWidths)) {
    const manual = manualOverrides[key] ?? 0
    resolved[key] = Math.max(contentWidth, manual)
  }

  return resolved
}
