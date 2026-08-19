import type { ImhMedicamentoFormData, ImhMedicamentoLinha } from '@/types'
import {
  createEmptyImhMedicamentoLinha,
  formatImhMedData,
  formatImhMedMoeda,
  formatImhMedNip,
  formatImhMedQtd,
  formatImhMedUppercase,
  linhaImhMedicamentoHasContent,
  withRecalculatedImhMedicamentoLinha,
} from '@/utils/imhMedicamentoForm'
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
      joined.includes('NIP') &&
      joined.includes('NOME') &&
      (joined.includes('ITEM') || joined.includes('PME') || joined.includes('MEDICAMENTO')) &&
      (joined.includes('QTD') || joined.includes('VALOR'))
    ) {
      return r
    }
  }
  return -1
}

function mapHeaderColumns(
  header: string[],
): Partial<Record<keyof ImhMedicamentoLinha, number>> {
  const map: Partial<Record<keyof ImhMedicamentoLinha, number>> = {}
  header.forEach((raw, index) => {
    const n = norm(raw)
    if (!n) return
    if (n === 'DATA') map.data = index
    else if (n === 'NIP') map.nip = index
    else if (n === 'NOME') map.nome = index
    else if (n.includes('ITEM') || (n.includes('PME') && n.includes('DESCRICAO'))) {
      map.itemPme = index
    } else if (n === 'LOTE') map.lote = index
    else if (n.includes('VALIDADE')) map.validade = index
    else if (n === 'QTD' || n === 'QT' || n === 'QUANTIDADE') map.qtd = index
    else if (n.includes('VALOR') && n.includes('UNIT')) map.valorUnitario = index
    else if (n === 'TOTAL' || (n.includes('VALOR') && n.includes('TOTAL'))) map.total = index
    else if (n.includes('NIP') && n.includes('TITULAR')) map.nipTitular = index
    else if (n.includes('POSTO') || n.includes('GRAD')) map.postoGrad = index
    else if (n.includes('VINCULO')) map.vinculo = index
    else if (n.includes('VALOR') && n.includes('INDENIZAR')) map.valorIndenizar = index
    else if (n.includes('INDENIZAR') || n.includes('%')) map.pctIndenizar = index
    else if (n === 'OM') map.om = index
    else if (n.includes('UNIDADE') && n.includes('FORNECIMENTO')) {
      map.unidadeFornecimento = index
    } else if (n.includes('QUANTIDADE') && n.includes('ADQUIRIDA')) {
      map.quantidadeAdquirida = index
    } else if (
      (n.includes('QTD') || n.includes('QUANTIDADE')) &&
      n.includes('OSE') &&
      (n.includes('FORNEC') || n.includes('FORNECIDA'))
    ) {
      map.qtdFornecidaOse = index
    } else if (n.includes('MANEIRA') && n.includes('FORNECIMENTO')) {
      map.maneiraFornecimento = index
    } else if (n.includes('MANEIRA') && (n.includes('DISPENS') || n.includes('FORNEC'))) {
      map.maneiraFornecimento = index
    }
  })
  return map
}

function normalizeImportDate(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const serial = parseFloat(trimmed.replace(',', '.'))
  if (Number.isFinite(serial) && serial > 30_000 && serial < 60_000) {
    const excelEpoch = Date.UTC(1899, 11, 30)
    const date = new Date(excelEpoch + Math.round(serial) * 86_400_000)
    const day = String(date.getUTCDate()).padStart(2, '0')
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const year = String(date.getUTCFullYear()).slice(-2)
    return `${day}/${month}/${year}`
  }
  return formatImhMedData(trimmed)
}

/** Validade no formato dd/mm/aaaa (ano com 4 dígitos). */
function normalizeImportValidade(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const serial = parseFloat(trimmed.replace(',', '.'))
  if (Number.isFinite(serial) && serial > 30_000 && serial < 60_000) {
    const excelEpoch = Date.UTC(1899, 11, 30)
    const date = new Date(excelEpoch + Math.round(serial) * 86_400_000)
    const day = String(date.getUTCDate()).padStart(2, '0')
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const year = String(date.getUTCFullYear())
    return `${day}/${month}/${year}`
  }
  return formatImhMedData(trimmed)
}

function normalizeMoney(raw: string): string {
  const n = parseValorBrasileiro(raw)
  if (n > 0) return formatValorBrasileiro(n)
  return formatImhMedMoeda(raw) || raw.trim()
}

export function parseImhMedicamentoFromGrid(rows: string[][]): ImhMedicamentoFormData {
  const headerIndex = findHeaderRow(rows)
  if (headerIndex < 0) {
    return { linhas: [] }
  }

  const colMap = mapHeaderColumns(rows[headerIndex] ?? [])
  const linhas: ImhMedicamentoLinha[] = []

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const nipRaw = colMap.nip !== undefined ? cell(rows, r, colMap.nip) : ''
    const nomeRaw = colMap.nome !== undefined ? cell(rows, r, colMap.nome) : ''
    const itemRaw = colMap.itemPme !== undefined ? cell(rows, r, colMap.itemPme) : ''
    if (!nipRaw.trim() && !nomeRaw.trim() && !itemRaw.trim()) {
      const joined = (rows[r] ?? []).map((v) => norm(String(v ?? ''))).join(' ')
      if (joined.includes('CHEFE') || joined.includes('ASSINAT') || joined.includes('TOTAL')) {
        break
      }
      continue
    }

    const linha = withRecalculatedImhMedicamentoLinha({
      ...createEmptyImhMedicamentoLinha(),
      id: `imh-med-import-${Date.now()}-${linhas.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
      data: colMap.data !== undefined ? normalizeImportDate(cell(rows, r, colMap.data)) : '',
      nip: formatImhMedNip(nipRaw),
      nome: formatImhMedUppercase(nomeRaw),
      itemPme: formatImhMedUppercase(itemRaw),
      lote: colMap.lote !== undefined ? formatImhMedUppercase(cell(rows, r, colMap.lote)) : '',
      validade:
        colMap.validade !== undefined
          ? normalizeImportValidade(cell(rows, r, colMap.validade))
          : '',
      qtd:
        colMap.qtd !== undefined
          ? formatImhMedQtd(cell(rows, r, colMap.qtd)) || '1'
          : '1',
      valorUnitario:
        colMap.valorUnitario !== undefined
          ? normalizeMoney(cell(rows, r, colMap.valorUnitario))
          : '',
      total: colMap.total !== undefined ? normalizeMoney(cell(rows, r, colMap.total)) : '',
      nipTitular:
        colMap.nipTitular !== undefined
          ? formatImhMedNip(cell(rows, r, colMap.nipTitular))
          : formatImhMedNip(nipRaw),
      postoGrad:
        colMap.postoGrad !== undefined
          ? formatImhMedUppercase(cell(rows, r, colMap.postoGrad))
          : '',
      vinculo:
        colMap.vinculo !== undefined
          ? formatImhMedUppercase(cell(rows, r, colMap.vinculo))
          : '',
      pctIndenizar:
        colMap.pctIndenizar !== undefined ? cell(rows, r, colMap.pctIndenizar).trim() : '',
      om: colMap.om !== undefined ? formatImhMedUppercase(cell(rows, r, colMap.om)) : '',
      unidadeFornecimento:
        colMap.unidadeFornecimento !== undefined
          ? formatImhMedUppercase(cell(rows, r, colMap.unidadeFornecimento))
          : '',
      quantidadeAdquirida:
        colMap.quantidadeAdquirida !== undefined
          ? formatImhMedQtd(cell(rows, r, colMap.quantidadeAdquirida))
          : '',
      qtdFornecidaOse:
        colMap.qtdFornecidaOse !== undefined
          ? formatImhMedQtd(cell(rows, r, colMap.qtdFornecidaOse))
          : '',
      maneiraFornecimento:
        colMap.maneiraFornecimento !== undefined
          ? formatImhMedUppercase(cell(rows, r, colMap.maneiraFornecimento))
          : '',
    })

    if (linhaImhMedicamentoHasContent(linha)) linhas.push(linha)
  }

  return { linhas }
}

export function mergeImhMedicamentoImport(
  current: ImhMedicamentoFormData,
  imported: ImhMedicamentoFormData,
): ImhMedicamentoFormData {
  const existingKeys = new Set(
    current.linhas.map(
      (l) => `${norm(l.nip)}|${norm(l.data)}|${norm(l.itemPme)}|${norm(l.nome)}`,
    ),
  )
  const novos = imported.linhas.filter((l) => {
    const key = `${norm(l.nip)}|${norm(l.data)}|${norm(l.itemPme)}|${norm(l.nome)}`
    if (existingKeys.has(key)) return false
    existingKeys.add(key)
    return true
  })

  return {
    linhas: [...current.linhas, ...novos],
    finalizedImhIds: current.finalizedImhIds ?? [],
    devolvidosImhIds: current.devolvidosImhIds ?? [],
  }
}

function sheetHasContent(sheet: SpreadsheetSheetImport): boolean {
  return sheet.rows.some((row) => row.some((cellValue) => String(cellValue ?? '').trim()))
}

export async function loadImhMedicamentoSheetsFromFile(
  file: File,
): Promise<SpreadsheetSheetImport[]> {
  return (await parseSpreadsheetSheetsFile(file)).filter(sheetHasContent)
}

/** Índice sugerido da aba Planilha / PME (ou -1 se não houver). */
export function findImhMedicamentoSheetIndex(sheets: SpreadsheetSheetImport[]): number {
  const exact = sheets.findIndex((s) => {
    const n = norm(s.nome)
    return n === 'PLANILHA' || n === 'IMH' || n.includes('PME')
  })
  if (exact >= 0) return exact
  return sheets.findIndex((s) => findHeaderRow(s.rows) >= 0)
}
