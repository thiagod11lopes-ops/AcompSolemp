import type { ListaMedicamentosFormData, ListaMedicamentosLinha } from '@/types'
import {
  createEmptyListaMedicamentosLinha,
  formatListaMedNeb,
  formatListaMedNome,
  formatListaMedPreco,
  formatListaMedQtd,
  formatListaMedUf,
  linhaListaMedicamentosHasContent,
  withNormalizedListaMedicamentosLinha,
} from '@/utils/listaMedicamentosForm'
import {
  parseSpreadsheetSheetsFile,
  type SpreadsheetSheetImport,
} from '@/utils/consumoMaterialOds'

function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function cleanImportedText(value: string): string {
  return value
    .replace(/<text:s\b([^>]*)\/>/gi, (_all, attrs: string) => {
      const count = Number(attrs.match(/text:c="(\d+)"/i)?.[1] ?? '1')
      return ' '.repeat(Number.isFinite(count) && count > 0 ? Math.min(count, 40) : 1)
    })
    .replace(/<\/?text:[^>]+>/gi, ' ')
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cell(rows: string[][], r: number, c: number): string {
  return cleanImportedText(String(rows[r]?.[c] ?? ''))
}

function findHeaderRow(rows: string[][]): number {
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    const joined = (rows[r] ?? []).map((v) => norm(String(v ?? ''))).join('|')
    if (
      joined.includes('NEB') &&
      joined.includes('MEDICAMENTO') &&
      (joined.includes('PRECO') || joined.includes('REFERENCIA') || joined.includes('UF'))
    ) {
      return r
    }
  }
  return -1
}

function mapHeaderColumns(
  header: string[],
): Partial<Record<keyof ListaMedicamentosLinha, number>> {
  const map: Partial<Record<keyof ListaMedicamentosLinha, number>> = {}
  header.forEach((raw, index) => {
    const n = norm(raw)
    if (!n) return
    if (n === 'NEB') map.neb = index
    else if (n.includes('MEDICAMENTO')) map.medicamento = index
    else if (n === 'UF') map.uf = index
    else if (n === 'QTD' || n === 'QUANTIDADE') map.qtd = index
    else if (n.includes('ESTOQUE') && n.includes('BAIXO')) map.estoqueBaixo = index
    else if (n.includes('PRECO') || n.includes('REFERENCIA')) map.precoReferencia = index
  })
  return map
}

export function parseListaMedicamentosFromGrid(rows: string[][]): ListaMedicamentosFormData {
  const headerIndex = findHeaderRow(rows)
  if (headerIndex < 0) {
    return { linhas: [] }
  }

  const colMap = mapHeaderColumns(rows[headerIndex] ?? [])
  const linhas: ListaMedicamentosLinha[] = []

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const nebRaw = colMap.neb !== undefined ? cell(rows, r, colMap.neb) : ''
    const medRaw = colMap.medicamento !== undefined ? cell(rows, r, colMap.medicamento) : ''
    if (!nebRaw.trim() && !medRaw.trim()) continue

    const linha = withNormalizedListaMedicamentosLinha({
      ...createEmptyListaMedicamentosLinha(),
      id: `lista-med-import-${Date.now()}-${linhas.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
      neb: formatListaMedNeb(nebRaw),
      medicamento: formatListaMedNome(medRaw),
      uf: colMap.uf !== undefined ? formatListaMedUf(cell(rows, r, colMap.uf)) : '',
      qtd: colMap.qtd !== undefined ? formatListaMedQtd(cell(rows, r, colMap.qtd)) : '',
      estoqueBaixo:
        colMap.estoqueBaixo !== undefined
          ? formatListaMedQtd(cell(rows, r, colMap.estoqueBaixo))
          : '',
      precoReferencia:
        colMap.precoReferencia !== undefined
          ? formatListaMedPreco(cell(rows, r, colMap.precoReferencia))
          : '',
    })

    if (linhaListaMedicamentosHasContent(linha)) linhas.push(linha)
  }

  return { linhas }
}

export function mergeListaMedicamentosImport(
  current: ListaMedicamentosFormData,
  imported: ListaMedicamentosFormData,
): ListaMedicamentosFormData {
  const existingKeys = new Set(
    current.linhas.map((l) => `${norm(l.neb)}|${norm(l.medicamento)}`),
  )
  const novos = imported.linhas.filter((l) => {
    const key = `${norm(l.neb)}|${norm(l.medicamento)}`
    if (existingKeys.has(key)) return false
    existingKeys.add(key)
    return true
  })

  return {
    linhas: [...current.linhas, ...novos],
  }
}

function sheetHasContent(sheet: SpreadsheetSheetImport): boolean {
  return sheet.rows.some((row) => row.some((cellValue) => String(cellValue ?? '').trim()))
}

export async function loadListaMedicamentosSheetsFromFile(
  file: File,
): Promise<SpreadsheetSheetImport[]> {
  return (await parseSpreadsheetSheetsFile(file)).filter(sheetHasContent)
}

/** Índice sugerido da aba com NEB/Medicamento (ou -1). */
export function findListaMedicamentosSheetIndex(sheets: SpreadsheetSheetImport[]): number {
  const byHeader = sheets.findIndex((s) => findHeaderRow(s.rows) >= 0)
  if (byHeader >= 0) return byHeader
  const byName = sheets.findIndex((s) => {
    const n = norm(s.nome)
    return n.includes('PLANILHA1') || n.includes('MEDICAMENTO') || n.includes('PRECO')
  })
  return byName
}
