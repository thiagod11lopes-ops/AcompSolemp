import { formatValorBrasileiro, type ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import {
  atualizarCampoConsumo,
  type ConsumoMaterialColunaKey,
} from '@/utils/consumoMaterialTemplate'

export const MIN_COL_WIDTH = 48

/** Padding real das células (.excel-sheet-grid: 2px 6px → 12px horizontal). */
const TABLE_CELL_H_PAD = 12
/** Padding do input editável (.excel-editable-input: 1px 4px → 8px). */
const INPUT_H_PAD = 8
const RESIZE_GUTTER = 6
const SORT_ICON_EXTRA = 18

/** Fontes alinhadas a spreadsheet-excel.css (Calibri 11px). */
const MEASURE_STYLES = {
  header: {
    fontSize: '10px',
    fontWeight: '700',
    fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif",
    letterSpacing: '0.04em',
  },
  body: {
    fontSize: '11px',
    fontWeight: '400',
    fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif",
    letterSpacing: 'normal',
  },
  input: {
    fontSize: '11px',
    fontWeight: '400',
    fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif",
    letterSpacing: 'normal',
  },
  valor: {
    fontSize: '11px',
    fontWeight: '600',
    fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif",
    letterSpacing: 'normal',
  },
  valorInput: {
    fontSize: '11px',
    fontWeight: '400',
    fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif",
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
  if (key === 'valorUnitario') {
    const raw = String(row.valorUnitario ?? '').trim()
    if (raw) return toSingleLine(raw)
  }
  return toSingleLine(String(row[key as keyof ConsumoMaterialRow] ?? ''))
}

function measureInDom(text: string, variant: MeasureVariant): number {
  if (typeof document === 'undefined') return text.length * 7

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
  col: { key: string; label: string; width?: number },
  editable: boolean,
): number {
  const isValor = col.key === 'valor' || col.key === 'valorUnitario'
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

  // Fit-to-content: mede o maior texto da coluna (rótulo + células).
  return Math.max(MIN_COL_WIDTH, maxContent + cellPad + RESIZE_GUTTER)
}

export function measureColumnWidths(
  rows: ConsumoMaterialRow[],
  headers: ReadonlyArray<{ key: string; label: string; width?: number }>,
  editable = false,
): Record<string, number> {
  const widths: Record<string, number> = {}
  for (const col of headers) {
    widths[col.key] = measureColumnContent(rows, col, editable)
  }
  return widths
}

/**
 * Mede larguras fit-to-content para planilhas genéricas (ex.: Preço de Medicamentos).
 * Cada coluna usa o maior entre o rótulo e o texto das células.
 */
export function measurePlainColumnWidths(
  rows: Array<Record<string, unknown>>,
  headers: ReadonlyArray<{ key: string; label: string }>,
  editable = false,
): Record<string, number> {
  const widths: Record<string, number> = {}
  const cellPad = editable ? TABLE_CELL_H_PAD + INPUT_H_PAD : TABLE_CELL_H_PAD

  for (const col of headers) {
    const isPreco = /preco|valor|preço/i.test(col.key) || /preço|valor/i.test(col.label)
    const bodyVariant: MeasureVariant = isPreco ? 'valor' : 'body'
    const inputVariant: MeasureVariant = isPreco ? 'valorInput' : 'input'

    let maxContent = measureInDom(col.label, 'header') + SORT_ICON_EXTRA
    for (const row of rows) {
      const text = toSingleLine(String(row[col.key] ?? ''))
      if (!text) continue
      maxContent = Math.max(maxContent, measureInDom(text, bodyVariant))
      if (editable) {
        maxContent = Math.max(maxContent, measureInDom(text, inputVariant))
      }
    }
    widths[col.key] = Math.max(MIN_COL_WIDTH, maxContent + cellPad + RESIZE_GUTTER)
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
    'select-as': Math.max(selectWidth, manualOverrides['select-as'] ?? manualOverrides.select ?? 0),
    'select-imh': Math.max(
      selectWidth,
      manualOverrides['select-imh'] ?? manualOverrides.select ?? 0,
    ),
  }

  for (const [key, contentWidth] of Object.entries(contentWidths)) {
    const manual = manualOverrides[key] ?? 0
    resolved[key] = Math.max(contentWidth, manual)
  }

  return resolved
}
