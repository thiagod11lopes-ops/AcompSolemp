import type { ListaMateriaisFormData, ListaMateriaisLinha } from '@/types'
import {
  createEmptyListaMateriaisLinha,
  formatListaItem,
  formatListaMoeda,
  formatListaQuantidade,
  formatListaUppercase,
  linhaListaHasContent,
} from '@/utils/listaMateriaisForm'
import {
  formatValorBrasileiro,
  parseSpreadsheetSheetsFile,
  parseValorBrasileiro,
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
    .replace(/&quot;/gi, '"')
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
      joined.includes('ITEM') &&
      (joined.includes('CATMAT') || joined.includes('ESPECIFICACAO') || joined.includes('PI'))
    ) {
      return r
    }
  }
  return -1
}

function mapHeaderColumns(header: string[]): Partial<Record<keyof ListaMateriaisLinha, number>> {
  const map: Partial<Record<keyof ListaMateriaisLinha, number>> = {}
  header.forEach((raw, index) => {
    const n = norm(raw)
    if (!n) return
    if (n === 'ITEM') map.item = index
    else if (n === 'PI') map.pi = index
    else if (n.includes('CATMAT')) map.catmat = index
    else if (n === 'LOTE') map.lote = index
    else if (n.includes('ESPECIFIC')) map.especificacao = index
    else if (n === 'UF' || n.includes('UNIDADE')) map.uf = index
    else if (n.includes('QTD') && n.includes('MIN')) map.qtdMin = index
    else if (n.includes('QTD') && n.includes('TOTAL')) map.qtdTotal = index
    else if (n.includes('VALOR') || n.includes('PRECO') || n.includes('PREÇO')) map.valor = index
    else if (n.includes('FORNECEDOR')) map.fornecedor = index
  })
  return map
}

function extractApendice(rows: string[][]): string {
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
      const value = cell(rows, r, c)
      const n = norm(value)
      if (n.includes('APENDICE') || (n.includes('PE ') && /\d/.test(n))) {
        return formatListaUppercase(value)
      }
    }
  }
  return ''
}

function normalizeMoney(raw: string): string {
  const n = parseValorBrasileiro(raw)
  if (n > 0) return formatValorBrasileiro(n)
  return formatListaMoeda(raw) || raw.trim()
}

function resolveExtraColumns(
  rows: string[][],
  headerIndex: number,
  colMap: Partial<Record<keyof ListaMateriaisLinha, number>>,
): void {
  if (colMap.valor !== undefined && colMap.fornecedor !== undefined) return
  const sample = rows[headerIndex + 1] ?? []
  for (let c = 0; c < sample.length; c++) {
    const used = Object.values(colMap).includes(c)
    if (used) continue
    const raw = cell(rows, headerIndex + 1, c)
    if (!raw) continue
    if (colMap.valor === undefined && (raw.includes('R$') || parseValorBrasileiro(raw) > 0)) {
      colMap.valor = c
      continue
    }
    if (
      colMap.fornecedor === undefined &&
      /^[A-Za-z]/.test(raw) &&
      !/^\d/.test(raw) &&
      raw.length < 40
    ) {
      colMap.fornecedor = c
    }
  }
}

export function parseListaMateriaisFromGrid(rows: string[][]): ListaMateriaisFormData {
  const headerIndex = findHeaderRow(rows)
  if (headerIndex < 0) {
    return { apendice: '', linhas: [] }
  }

  const apendice = extractApendice(rows)
  const colMap = mapHeaderColumns(rows[headerIndex] ?? [])
  resolveExtraColumns(rows, headerIndex, colMap)
  const linhas: ListaMateriaisLinha[] = []

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const itemRaw = colMap.item !== undefined ? cell(rows, r, colMap.item) : ''
    const piRaw = colMap.pi !== undefined ? cell(rows, r, colMap.pi) : ''
    const especRaw =
      colMap.especificacao !== undefined ? cell(rows, r, colMap.especificacao) : ''
    if (!itemRaw.trim() && !piRaw.trim() && !especRaw.trim()) continue

    const linha: ListaMateriaisLinha = {
      ...createEmptyListaMateriaisLinha(),
      id: `lista-import-${Date.now()}-${linhas.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
      item: formatListaItem(itemRaw) || String(linhas.length + 1),
      pi: formatListaUppercase(piRaw),
      catmat:
        colMap.catmat !== undefined
          ? formatListaUppercase(cell(rows, r, colMap.catmat))
          : '',
      lote:
        colMap.lote !== undefined ? formatListaUppercase(cell(rows, r, colMap.lote)) : '',
      especificacao: formatListaUppercase(especRaw),
      uf: colMap.uf !== undefined ? formatListaUppercase(cell(rows, r, colMap.uf)) : '',
      qtdMin:
        colMap.qtdMin !== undefined
          ? formatListaQuantidade(cell(rows, r, colMap.qtdMin))
          : '',
      qtdTotal:
        colMap.qtdTotal !== undefined
          ? formatListaQuantidade(cell(rows, r, colMap.qtdTotal))
          : '',
      valor: colMap.valor !== undefined ? normalizeMoney(cell(rows, r, colMap.valor)) : '',
      fornecedor:
        colMap.fornecedor !== undefined
          ? formatListaUppercase(cell(rows, r, colMap.fornecedor))
          : '',
    }

    if (linhaListaHasContent(linha)) linhas.push(linha)
  }

  return { apendice, linhas }
}

export function mergeListaMateriaisImport(
  current: ListaMateriaisFormData,
  imported: ListaMateriaisFormData,
): ListaMateriaisFormData {
  const existingKeys = new Set(
    current.linhas.map(
      (l) => `${norm(l.item)}|${norm(l.pi)}|${norm(l.catmat)}|${norm(l.especificacao).slice(0, 80)}`,
    ),
  )
  const novos = imported.linhas.filter((l) => {
    const key = `${norm(l.item)}|${norm(l.pi)}|${norm(l.catmat)}|${norm(l.especificacao).slice(0, 80)}`
    if (existingKeys.has(key)) return false
    existingKeys.add(key)
    return true
  })

  return {
    apendice: imported.apendice.trim() || current.apendice,
    linhas: [...current.linhas, ...novos],
  }
}

function sheetHasContent(sheet: SpreadsheetSheetImport): boolean {
  return sheet.rows.some((row) => row.some((cellValue) => String(cellValue ?? '').trim()))
}

export async function loadListaMateriaisSheetsFromFile(
  file: File,
): Promise<SpreadsheetSheetImport[]> {
  return (await parseSpreadsheetSheetsFile(file)).filter(sheetHasContent)
}

export function findListaMateriaisSheetIndex(sheets: SpreadsheetSheetImport[]): number {
  const exact = sheets.findIndex((s) => {
    const n = norm(s.nome)
    return n === 'LISTA DE MATERIAIS' || n === 'LISTA DE MATERIAL'
  })
  if (exact >= 0) return exact
  return sheets.findIndex((s) => norm(s.nome).includes('LISTA'))
}
