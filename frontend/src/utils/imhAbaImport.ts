import type { ImhAbaFormData, ImhAbaLinha } from '@/types'
import {
  createEmptyImhAbaLinha,
  formatImhData,
  formatImhMoeda,
  formatImhNip,
  formatImhNumeroCp,
  formatImhQuantidade,
  formatImhUppercase,
  linhaHasContent,
  withRecalculatedImhLinha,
} from '@/utils/imhAbaForm'
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
      (joined.includes('VINCULO') || joined.includes('DESCRICAO') || joined.includes('QUANTI'))
    ) {
      return r
    }
  }
  return -1
}

function mapHeaderColumns(header: string[]): Partial<Record<keyof ImhAbaLinha, number>> {
  const map: Partial<Record<keyof ImhAbaLinha, number>> = {}
  header.forEach((raw, index) => {
    const n = norm(raw)
    if (!n) return
    if (n === 'DATA') map.data = index
    else if (n === 'NIP') map.nip = index
    else if (n.includes('NOME')) map.nomeUsuario = index
    else if (n.includes('VINCULO')) map.vinculo = index
    else if (n.includes('DESCRICAO') || n.includes('PROCEDIMENTO') || n.includes('MEDICAMENTO')) {
      map.descricao = index
    } else if (n.includes('NIP') && n.includes('TITULAR')) map.nipTitular = index
    else if (n.includes('VALOR') && n.includes('UNIT')) map.valorUnit = index
    else if (n.includes('QUANTI') || n === 'QT' || n === 'QTD') map.quantidade = index
    else if (n.includes('VALOR') && n.includes('TOTAL')) map.valorTotal = index
    else if (n.includes('INDENIZAR') || n.includes('%')) map.pctIndenizar = index
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
  return formatImhData(trimmed)
}

function normalizeMoney(raw: string): string {
  const n = parseValorBrasileiro(raw)
  if (n > 0) return formatValorBrasileiro(n)
  return formatImhMoeda(raw) || raw.trim()
}

function extractCabecalho(rows: string[][]): Pick<ImhAbaFormData, 'clinica' | 'numeroCp'> {
  let clinica = ''
  let numeroCp = ''
  for (let r = 0; r < Math.min(rows.length, 8); r++) {
    for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
      const value = cell(rows, r, c)
      const n = norm(value)
      if (!n) continue
      if (n.includes('CLINICA') && !clinica) {
        clinica = formatImhUppercase(value)
      }
      if ((n.includes('ANEXO') && n.includes('CP')) || n.includes('Nº CP') || n.includes('N° CP')) {
        const nearby = [cell(rows, r, c + 1), cell(rows, r, c + 2), value]
          .map((v) => v.match(/(\d{1,2}\/\d{2,4})/)?.[1] ?? '')
          .find(Boolean)
        if (nearby) numeroCp = formatImhNumeroCp(nearby)
      }
      const cpOnly = value.match(/^(\d{1,2}\/\d{2,4})$/)
      if (cpOnly && !numeroCp) numeroCp = formatImhNumeroCp(cpOnly[1])
    }
  }
  return { clinica, numeroCp }
}

export function parseImhAbaFromGrid(rows: string[][]): ImhAbaFormData {
  const headerIndex = findHeaderRow(rows)
  if (headerIndex < 0) {
    return { clinica: '', numeroCp: '', linhas: [] }
  }

  const { clinica, numeroCp } = extractCabecalho(rows)
  const colMap = mapHeaderColumns(rows[headerIndex] ?? [])
  const linhas: ImhAbaLinha[] = []

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const nipRaw = colMap.nip !== undefined ? cell(rows, r, colMap.nip) : ''
    const nomeRaw = colMap.nomeUsuario !== undefined ? cell(rows, r, colMap.nomeUsuario) : ''
    const descricaoRaw = colMap.descricao !== undefined ? cell(rows, r, colMap.descricao) : ''
    if (!nipRaw.trim() && !nomeRaw.trim() && !descricaoRaw.trim()) {
      // assinatura / rodapé
      const joined = (rows[r] ?? []).map((v) => norm(String(v ?? ''))).join(' ')
      if (joined.includes('CHEFE') || joined.includes('ASSINAT')) break
      continue
    }

    const linha = withRecalculatedImhLinha({
      ...createEmptyImhAbaLinha(),
      id: `imh-import-${Date.now()}-${linhas.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
      data: colMap.data !== undefined ? normalizeImportDate(cell(rows, r, colMap.data)) : '',
      nip: formatImhNip(nipRaw),
      nomeUsuario: formatImhUppercase(nomeRaw),
      vinculo:
        colMap.vinculo !== undefined
          ? formatImhUppercase(cell(rows, r, colMap.vinculo))
          : '',
      descricao: formatImhUppercase(descricaoRaw),
      nipTitular:
        colMap.nipTitular !== undefined
          ? formatImhNip(cell(rows, r, colMap.nipTitular))
          : formatImhNip(nipRaw),
      valorUnit:
        colMap.valorUnit !== undefined ? normalizeMoney(cell(rows, r, colMap.valorUnit)) : '',
      quantidade:
        colMap.quantidade !== undefined
          ? formatImhQuantidade(cell(rows, r, colMap.quantidade)) || '1'
          : '1',
      valorTotal:
        colMap.valorTotal !== undefined ? normalizeMoney(cell(rows, r, colMap.valorTotal)) : '',
      pctIndenizar:
        colMap.pctIndenizar !== undefined ? cell(rows, r, colMap.pctIndenizar).trim() : '',
    })

    if (linhaHasContent(linha)) linhas.push(linha)
  }

  return { clinica, numeroCp, linhas }
}

export function mergeImhImport(
  current: ImhAbaFormData,
  imported: ImhAbaFormData,
): ImhAbaFormData {
  const existingKeys = new Set(
    current.linhas.map(
      (l) => `${norm(l.nip)}|${norm(l.data)}|${norm(l.descricao)}|${norm(l.nomeUsuario)}`,
    ),
  )
  const novos = imported.linhas.filter((l) => {
    const key = `${norm(l.nip)}|${norm(l.data)}|${norm(l.descricao)}|${norm(l.nomeUsuario)}`
    if (existingKeys.has(key)) return false
    existingKeys.add(key)
    return true
  })

  return {
    clinica: imported.clinica.trim() || current.clinica,
    numeroCp: imported.numeroCp.trim() || current.numeroCp,
    linhas: [...current.linhas, ...novos],
  }
}

function sheetHasContent(sheet: SpreadsheetSheetImport): boolean {
  return sheet.rows.some((row) => row.some((cellValue) => String(cellValue ?? '').trim()))
}

export async function loadImhSheetsFromFile(file: File): Promise<SpreadsheetSheetImport[]> {
  return (await parseSpreadsheetSheetsFile(file)).filter(sheetHasContent)
}

/** Índice sugerido da aba IMH (ou -1 se não houver). */
export function findImhSheetIndex(sheets: SpreadsheetSheetImport[]): number {
  const exact = sheets.findIndex((s) => norm(s.nome) === 'IMH')
  if (exact >= 0) return exact
  return sheets.findIndex((s) => norm(s.nome).includes('IMH'))
}
