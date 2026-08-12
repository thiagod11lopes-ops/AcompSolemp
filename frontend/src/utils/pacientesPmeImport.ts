import {
  createEmptyPacientePmeRow,
  formatPacientePmeUpper,
  normalizePacientesPmeRows,
  type PacientePmeRow,
} from '@/utils/pacientesPme'
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
      joined.includes('NOME') &&
      joined.includes('NIP') &&
      (joined.includes('VINCULO') || joined.includes('POSTO') || joined.includes('TITULAR'))
    ) {
      return r
    }
  }
  return -1
}

function mapHeaderColumns(header: string[]): Partial<Record<keyof PacientePmeRow, number>> {
  const map: Partial<Record<keyof PacientePmeRow, number>> = {}
  header.forEach((raw, index) => {
    const n = norm(raw)
    if (!n) return
    if (n === 'NOME' || n.startsWith('NOME ')) map.nome = index
    else if (n.includes('NIP') && n.includes('USUARIO')) map.nipUsuario = index
    else if (n.includes('NIP') && n.includes('TITULAR')) map.nipTitular = index
    else if (n.includes('POSTO') || n.includes('GRAD')) map.postoGradTitular = index
    else if (n.includes('VINCULO')) map.vinculo = index
    else if (n === 'NIP' && map.nipUsuario === undefined) map.nipUsuario = index
  })
  return map
}

export function parsePacientesPmeFromGrid(rows: string[][]): PacientePmeRow[] {
  const headerIndex = findHeaderRow(rows)
  if (headerIndex < 0) return []

  const colMap = mapHeaderColumns(rows[headerIndex] ?? [])
  const parsed: PacientePmeRow[] = []

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const nome = colMap.nome !== undefined ? cell(rows, r, colMap.nome) : ''
    const nipUsuario = colMap.nipUsuario !== undefined ? cell(rows, r, colMap.nipUsuario) : ''
    if (!nome.trim() && !nipUsuario.trim()) continue

    parsed.push({
      ...createEmptyPacientePmeRow(
        `paciente-pme-import-${Date.now()}-${parsed.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
      ),
      nome: formatPacientePmeUpper(nome),
      nipUsuario: nipUsuario.trim(),
      nipTitular:
        colMap.nipTitular !== undefined ? cell(rows, r, colMap.nipTitular).trim() : '',
      postoGradTitular:
        colMap.postoGradTitular !== undefined
          ? formatPacientePmeUpper(cell(rows, r, colMap.postoGradTitular))
          : '',
      vinculo:
        colMap.vinculo !== undefined
          ? formatPacientePmeUpper(cell(rows, r, colMap.vinculo))
          : '',
    })
  }

  return normalizePacientesPmeRows(parsed)
}

export function mergePacientesPmeImport(
  current: PacientePmeRow[],
  imported: PacientePmeRow[],
): PacientePmeRow[] {
  const existingKeys = new Set(
    current.map((l) => `${norm(l.nipUsuario)}|${norm(l.nome)}`),
  )
  const novos = imported.filter((l) => {
    const key = `${norm(l.nipUsuario)}|${norm(l.nome)}`
    if (existingKeys.has(key)) return false
    existingKeys.add(key)
    return true
  })
  return [...current, ...novos]
}

function sheetHasContent(sheet: SpreadsheetSheetImport): boolean {
  return sheet.rows.some((row) => row.some((cellValue) => String(cellValue ?? '').trim()))
}

export async function loadPacientesPmeSheetsFromFile(
  file: File,
): Promise<SpreadsheetSheetImport[]> {
  return (await parseSpreadsheetSheetsFile(file)).filter(sheetHasContent)
}

export function findPacientesPmeSheetIndex(sheets: SpreadsheetSheetImport[]): number {
  const byHeader = sheets.findIndex((s) => findHeaderRow(s.rows) >= 0)
  if (byHeader >= 0) return byHeader
  return sheets.findIndex((s) => {
    const n = norm(s.nome)
    return n.includes('PLANILHA') || n.includes('PACIENTE') || n.includes('BANCO')
  })
}
