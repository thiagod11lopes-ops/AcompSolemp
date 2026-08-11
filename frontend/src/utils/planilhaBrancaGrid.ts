/** Modelo rico de planilha (estilos, mesclas, dimensões). */

export const PLANILHA_BRANCA_COLS = 26
export const PLANILHA_BRANCA_ROWS = 50
export const PLANILHA_BRANCA_CELL_WIDTH = 80
export const PLANILHA_BRANCA_ROW_HEADER_WIDTH = 40
export const PLANILHA_BRANCA_ROW_HEIGHT = 22

export type PlanilhaHAlign = 'left' | 'center' | 'right'
export type PlanilhaVAlign = 'top' | 'middle' | 'bottom'

export interface PlanilhaCellStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  fontSize?: number
  fontFamily?: string
  color?: string
  backgroundColor?: string
  horizontalAlign?: PlanilhaHAlign
  verticalAlign?: PlanilhaVAlign
  wrapText?: boolean
  borderTop?: string
  borderRight?: string
  borderBottom?: string
  borderLeft?: string
}

export interface PlanilhaCellData {
  value: string
  style?: PlanilhaCellStyle
}

export interface PlanilhaMergeRange {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

export interface PlanilhaSheetData {
  cells: PlanilhaCellData[][]
  merges: PlanilhaMergeRange[]
  colWidths?: number[]
  rowHeights?: number[]
}

export function colIndexToLetter(index: number): string {
  let n = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

export function emptyCell(value = ''): PlanilhaCellData {
  return { value }
}

export function createEmptySheetData(
  rows = PLANILHA_BRANCA_ROWS,
  cols = PLANILHA_BRANCA_COLS,
): PlanilhaSheetData {
  return {
    cells: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => emptyCell()),
    ),
    merges: [],
    colWidths: Array.from({ length: cols }, () => PLANILHA_BRANCA_CELL_WIDTH),
    rowHeights: Array.from({ length: rows }, () => PLANILHA_BRANCA_ROW_HEIGHT),
  }
}

export function sheetFromPlainGrid(grid: string[][] | undefined): PlanilhaSheetData {
  const base = createEmptySheetData()
  if (!grid?.length) return base
  const rowCount = Math.max(PLANILHA_BRANCA_ROWS, grid.length)
  const colCount = Math.max(
    PLANILHA_BRANCA_COLS,
    ...grid.map((row) => row?.length ?? 0),
    0,
  )
  const cells = Array.from({ length: rowCount }, (_, r) =>
    Array.from({ length: colCount }, (_, c) => emptyCell(grid[r]?.[c] ?? '')),
  )
  return {
    cells,
    merges: [],
    colWidths: Array.from({ length: colCount }, () => PLANILHA_BRANCA_CELL_WIDTH),
    rowHeights: Array.from({ length: rowCount }, () => PLANILHA_BRANCA_ROW_HEIGHT),
  }
}

export function normalizeSheetData(sheet: PlanilhaSheetData | undefined): PlanilhaSheetData {
  if (!sheet?.cells?.length) return createEmptySheetData()
  const rowCount = Math.max(PLANILHA_BRANCA_ROWS, sheet.cells.length)
  const colCount = Math.max(
    PLANILHA_BRANCA_COLS,
    ...sheet.cells.map((row) => row?.length ?? 0),
    0,
  )
  const cells = Array.from({ length: rowCount }, (_, r) =>
    Array.from({ length: colCount }, (_, c) => {
      const src = sheet.cells[r]?.[c]
      if (!src) return emptyCell()
      return {
        value: src.value ?? '',
        style: src.style ? { ...src.style } : undefined,
      }
    }),
  )
  return {
    cells,
    merges: (sheet.merges ?? []).map((m) => ({ ...m })),
    colWidths: Array.from(
      { length: colCount },
      (_, i) => sheet.colWidths?.[i] ?? PLANILHA_BRANCA_CELL_WIDTH,
    ),
    rowHeights: Array.from(
      { length: rowCount },
      (_, i) => sheet.rowHeights?.[i] ?? PLANILHA_BRANCA_ROW_HEIGHT,
    ),
  }
}

/** @deprecated use createEmptySheetData */
export function createEmptySpreadsheetGrid(
  rows = PLANILHA_BRANCA_ROWS,
  cols = PLANILHA_BRANCA_COLS,
): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''))
}

/** @deprecated use normalizeSheetData / sheetFromPlainGrid */
export function normalizeSpreadsheetGrid(
  grid: string[][] | undefined,
  minRows = PLANILHA_BRANCA_ROWS,
  minCols = PLANILHA_BRANCA_COLS,
): string[][] {
  const rowCount = Math.max(minRows, grid?.length ?? 0)
  const colCount = Math.max(
    minCols,
    ...(grid ?? []).map((row) => row?.length ?? 0),
    0,
  )
  const base = createEmptySpreadsheetGrid(rowCount, colCount)
  if (!grid?.length) return base
  for (let r = 0; r < Math.min(rowCount, grid.length); r += 1) {
    const row = grid[r] ?? []
    for (let c = 0; c < Math.min(colCount, row.length); c += 1) {
      base[r][c] = row[c] ?? ''
    }
  }
  return base
}

/** @deprecated use normalizeSheetData on imported rich sheets */
export function gridFromImportedRows(rows: string[][]): string[][] {
  return normalizeSpreadsheetGrid(rows)
}

export function isCellCoveredByMerge(
  row: number,
  col: number,
  merges: PlanilhaMergeRange[],
): PlanilhaMergeRange | null {
  for (const merge of merges) {
    if (
      row >= merge.startRow &&
      row <= merge.endRow &&
      col >= merge.startCol &&
      col <= merge.endCol
    ) {
      return merge
    }
  }
  return null
}

export function isMergeOrigin(row: number, col: number, merge: PlanilhaMergeRange): boolean {
  return merge.startRow === row && merge.startCol === col
}
