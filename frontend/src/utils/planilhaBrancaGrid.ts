/** Grade vazia estilo Excel (letras A–Z e numeração de linhas). */

export const PLANILHA_BRANCA_COLS = 26
export const PLANILHA_BRANCA_ROWS = 50
export const PLANILHA_BRANCA_CELL_WIDTH = 80
export const PLANILHA_BRANCA_ROW_HEADER_WIDTH = 40
export const PLANILHA_BRANCA_ROW_HEIGHT = 22

export function colIndexToLetter(index: number): string {
  let n = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

export function createEmptySpreadsheetGrid(
  rows = PLANILHA_BRANCA_ROWS,
  cols = PLANILHA_BRANCA_COLS,
): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''))
}

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

export function gridFromImportedRows(rows: string[][]): string[][] {
  return normalizeSpreadsheetGrid(rows)
}
