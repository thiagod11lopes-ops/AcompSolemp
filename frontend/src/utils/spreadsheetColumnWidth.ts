import { formatValorBrasileiro, type ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import {
  atualizarCampoConsumo,
  type ConsumoMaterialColunaKey,
} from '@/utils/consumoMaterialTemplate'

export const MIN_COL_WIDTH = 48

/** MUI TableCell default horizontal padding (16px × 2). */
const TABLE_CELL_H_PAD = 32
/** SpreadsheetEditableCell input px: 0.75 × 2. */
const INPUT_H_PAD = 12
const RESIZE_GUTTER = 4
const SORT_ICON_EXTRA = 22

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
  valorInput: {
    fontSize: '0.78rem',
    fontWeight: '400',
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

function parseDraftKey(key: string): { rowId: string; field: ConsumoMaterialColunaKey } | null {
  const sep = key.indexOf(':')
  if (sep <= 0) return null
  return {
    rowId: key.slice(0, sep),
    field: key.slice(sep + 1) as ConsumoMaterialColunaKey,
  }
}

/** Une planilha completa com linhas exibidas/editadas (overlay vence por id). */
export function mergeRowsForColumnMeasure(
  baseRows: ConsumoMaterialRow[],
  overlayRows?: ConsumoMaterialRow[],
): ConsumoMaterialRow[] {
  if (!overlayRows?.length) return baseRows
  const byId = new Map(baseRows.map((row) => [row.id, row]))
  for (const row of overlayRows) {
    byId.set(row.id, row)
  }
  return Array.from(byId.values())
}

/** Aplica rascunhos de células em edição sobre as linhas de medição. */
export function applyEditingDrafts(
  rows: ConsumoMaterialRow[],
  drafts: Readonly<Record<string, string>>,
): ConsumoMaterialRow[] {
  const entries = Object.entries(drafts)
  if (!entries.length) return rows

  const byId = new Map(rows.map((row) => [row.id, row]))
  for (const [key, value] of entries) {
    const parsed = parseDraftKey(key)
    if (!parsed) continue
    const current = byId.get(parsed.rowId)
    if (!current) continue
    byId.set(parsed.rowId, atualizarCampoConsumo(current, parsed.field, value))
  }
  return Array.from(byId.values())
}

function measureColumnContent(
  rows: ConsumoMaterialRow[],
  col: { key: string; label: string },
  editable: boolean,
): number {
  const isValor = col.key === 'valor'
  const bodyVariant: MeasureVariant = isValor ? 'valor' : 'body'
  const inputVariant: MeasureVariant = isValor ? 'valorInput' : 'input'
  const cellPad = editable ? TABLE_CELL_H_PAD + INPUT_H_PAD : TABLE_CELL_H_PAD

  let maxContent = measureInDom(col.label, 'header') + SORT_ICON_EXTRA

  for (const row of rows) {
    const text = cellTextForMeasure(row, col.key)
    if (!text) continue
    const bodyWidth = measureInDom(text, bodyVariant)
    maxContent = Math.max(maxContent, bodyWidth)
    if (editable) {
      maxContent = Math.max(maxContent, measureInDom(text, inputVariant))
    }
  }

  return Math.max(MIN_COL_WIDTH, maxContent + cellPad + RESIZE_GUTTER)
}

export function measureColumnWidths(
  rows: ConsumoMaterialRow[],
  headers: ReadonlyArray<{ key: string; label: string }>,
  editable = false,
): Record<string, number> {
  const widths: Record<string, number> = {}
  for (const col of headers) {
    widths[col.key] = measureColumnContent(rows, col, editable)
  }
  return widths
}

export function resolveColumnWidths(
  contentWidths: Record<string, number>,
  manualOverrides: Record<string, number>,
  selectWidth = 40,
): Record<string, number> {
  const resolved: Record<string, number> = {
    'select-a': Math.max(selectWidth, manualOverrides['select-a'] ?? manualOverrides.select ?? 0),
    'select-s': Math.max(selectWidth, manualOverrides['select-s'] ?? manualOverrides.select ?? 0),
  }

  for (const [key, contentWidth] of Object.entries(contentWidths)) {
    const manual = manualOverrides[key] ?? 0
    resolved[key] = Math.max(contentWidth, manual)
  }

  return resolved
}
