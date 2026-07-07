import { formatValorBrasileiro, type ConsumoMaterialRow } from '@/utils/consumoMaterialOds'

const CHAR_PX = 7.5
const MONO_CHAR_PX = 8.2
const CELL_PAD = 24
export const MIN_COL_WIDTH = 48

function toSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

function cellTextForMeasure(row: ConsumoMaterialRow, key: string): string {
  if (key === 'valor' && row.valorNumerico > 0) {
    return formatValorBrasileiro(row.valorNumerico)
  }
  return toSingleLine(String(row[key as keyof ConsumoMaterialRow] ?? ''))
}

export function computeAutoColumnWidths(
  rows: ConsumoMaterialRow[],
  headers: ReadonlyArray<{ key: string; label: string; width: number }>,
  manualOverrides: Record<string, number> = {},
  selectWidth = 48,
): Record<string, number> {
  const widths: Record<string, number> = {
    select: Math.max(MIN_COL_WIDTH, manualOverrides.select ?? selectWidth),
  }

  for (const col of headers) {
    let maxChars = col.label.length
    for (const row of rows) {
      const text = cellTextForMeasure(row, col.key)
      if (text.length > maxChars) maxChars = text.length
    }
    const charPx = col.key === 'valor' ? MONO_CHAR_PX : CHAR_PX
    const autoWidth = Math.max(MIN_COL_WIDTH, Math.ceil(maxChars * charPx) + CELL_PAD)
    const manual = manualOverrides[col.key] ?? 0
    widths[col.key] = Math.max(autoWidth, manual)
  }

  return widths
}
