import { formatValorBrasileiro, type ConsumoMaterialRow } from '@/utils/consumoMaterialOds'

export const MIN_COL_WIDTH = 48
const CELL_PAD_READONLY = 36
const CELL_PAD_EDITABLE = 52
const MEASURE_BUFFER = 16
const SORT_ICON_EXTRA = 28

const MEASURE_STYLES = {
  header: {
    fontSize: '0.68rem',
    fontWeight: '700',
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
    letterSpacing: '0.4px',
  },
  body: {
    fontSize: '0.875rem',
    fontWeight: '400',
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
    letterSpacing: 'normal',
  },
  input: {
    fontSize: '0.78rem',
    fontWeight: '400',
    fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
    letterSpacing: 'normal',
  },
  valor: {
    fontSize: '0.875rem',
    fontWeight: '600',
    fontFamily: '"JetBrains Mono", "Roboto Mono", monospace',
    letterSpacing: 'normal',
  },
} as const

type MeasureVariant = keyof typeof MEASURE_STYLES

let measureNode: HTMLSpanElement | null = null

function toSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function cellTextForMeasure(row: ConsumoMaterialRow, key: string): string {
  if (key === 'valor' && row.valorNumerico > 0) {
    return formatValorBrasileiro(row.valorNumerico)
  }
  return toSingleLine(String(row[key as keyof ConsumoMaterialRow] ?? ''))
}

function measureInDom(text: string, variant: MeasureVariant): number {
  if (typeof document === 'undefined') return text.length * 8

  if (!measureNode) {
    measureNode = document.createElement('span')
    measureNode.style.position = 'absolute'
    measureNode.style.visibility = 'hidden'
    measureNode.style.whiteSpace = 'nowrap'
    measureNode.style.top = '-9999px'
    measureNode.style.left = '-9999px'
    measureNode.style.pointerEvents = 'none'
    document.body.appendChild(measureNode)
  }

  const style = MEASURE_STYLES[variant]
  measureNode.style.fontSize = style.fontSize
  measureNode.style.fontWeight = style.fontWeight
  measureNode.style.fontFamily = style.fontFamily
  measureNode.style.letterSpacing = style.letterSpacing
  measureNode.textContent = text || ' '
  return Math.ceil(measureNode.getBoundingClientRect().width)
}

export function measureColumnWidths(
  rows: ConsumoMaterialRow[],
  headers: ReadonlyArray<{ key: string; label: string }>,
  editable = false,
): Record<string, number> {
  const widths: Record<string, number> = {}
  const cellPad = editable ? CELL_PAD_EDITABLE : CELL_PAD_READONLY

  for (const col of headers) {
    const bodyVariant: MeasureVariant = col.key === 'valor' ? 'valor' : 'body'
    const inputVariant: MeasureVariant = col.key === 'valor' ? 'valor' : 'input'

    let maxContent =
      measureInDom(col.label, 'header') + SORT_ICON_EXTRA

    for (const row of rows) {
      const text = cellTextForMeasure(row, col.key)
      if (!text) continue
      maxContent = Math.max(maxContent, measureInDom(text, bodyVariant))
      if (editable) {
        maxContent = Math.max(maxContent, measureInDom(text, inputVariant))
      }
    }

    widths[col.key] = Math.max(
      MIN_COL_WIDTH,
      maxContent + cellPad + MEASURE_BUFFER,
    )
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
