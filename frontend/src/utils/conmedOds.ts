import { unzipSync } from 'fflate'

export interface ConmedSheet {
  name: string
  rows: string[][]
}

/** Abas internas/print areas a ignorar na navegação. */
const SHEETS_OCULTAS = /^(Excel_BuiltIn_|Print_Area_|__Anonymous_)/i

export const CONMED_EXEMPLO_URL = '/conmed/conmed-exemplo.ods'
export const CONMED_EXEMPLO_NOME =
  '025 26 - 65720-XXXX-2026 - CONMED 58-2025 - COMRJ - JUNHO 245 a 246'

const MAX_COLS = 40

function decodeXmlText(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
}

function extractRowTexts(rowXml: string): string[] {
  const cells: string[] = []
  const cellRe =
    /<table:table-cell([^>]*)>([\s\S]*?)<\/table:table-cell>|<table:table-cell([^>]*)\/>/g
  let match: RegExpExecArray | null
  while ((match = cellRe.exec(rowXml))) {
    const attrs = match[1] || match[3] || ''
    const repeat = attrs.match(/number-columns-repeated="(\d+)"/)
    const body = match[2] || ''
    const paragraphs = [...body.matchAll(/<text:p[^>]*>([\s\S]*?)<\/text:p>/g)]
    const val = decodeXmlText(paragraphs.map((p) => p[1].replace(/<[^>]+>/g, '')).join(' ').trim())
    const count = repeat ? Math.min(parseInt(repeat[1], 10), MAX_COLS) : 1
    for (let i = 0; i < count; i++) cells.push(val)
  }
  return cells.slice(0, MAX_COLS)
}

function trimMatrix(rows: string[][]): string[][] {
  let maxCols = 0
  for (const row of rows) {
    for (let i = row.length - 1; i >= 0; i--) {
      if (row[i]?.trim()) {
        maxCols = Math.max(maxCols, i + 1)
        break
      }
    }
  }
  const trimmed = rows
    .map((row) => {
      const next = row.slice(0, Math.max(maxCols, 1))
      while (next.length < maxCols) next.push('')
      return next
    })
    .filter((row) => row.some((cell) => cell.trim()))
  return trimmed
}

/** Extrai todas as planilhas nomeadas de um ODS (exceto print areas). */
export function parseOdsSheetsFromXml(xml: string): ConmedSheet[] {
  const tableRe = /<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/g
  const sheets: ConmedSheet[] = []
  let match: RegExpExecArray | null
  while ((match = tableRe.exec(xml))) {
    const name = match[1].match(/table:name="([^"]+)"/)?.[1]?.trim() || 'Sem nome'
    if (SHEETS_OCULTAS.test(name)) continue
    const body = match[2]
    const rows = [...body.matchAll(/<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g)].map(
      (rowMatch) => extractRowTexts(rowMatch[1]),
    )
    sheets.push({ name, rows: trimMatrix(rows) })
  }
  return sheets.filter((sheet) => sheet.rows.length > 0)
}

export async function parseOdsSheetsFromBuffer(buffer: ArrayBuffer): Promise<ConmedSheet[]> {
  const unzipped = unzipSync(new Uint8Array(buffer))
  const contentXml = unzipped['content.xml']
  if (!contentXml) throw new Error('Arquivo ODS inválido ou corrompido')
  return parseOdsSheetsFromXml(new TextDecoder('utf-8').decode(contentXml))
}

export async function parseOdsSheetsFromFile(file: File): Promise<ConmedSheet[]> {
  return parseOdsSheetsFromBuffer(await file.arrayBuffer())
}

/** Carrega a CONMED de exemplo anexada em /public/conmed. */
export async function loadConmedExemploBundled(): Promise<ConmedSheet[]> {
  const response = await fetch(CONMED_EXEMPLO_URL)
  if (!response.ok) {
    throw new Error('Não foi possível carregar a planilha CONMED de exemplo.')
  }
  return parseOdsSheetsFromBuffer(await response.arrayBuffer())
}
