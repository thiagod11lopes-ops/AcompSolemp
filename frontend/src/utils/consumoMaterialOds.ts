import { unzipSync } from 'fflate'
import type { CreatePedidoInput } from '@/services/clinicaPedidoService'
import type { PacienteVinculo, TipoUsuarioPaciente } from '@/types'
import { formatNip } from '@/utils/format'

export interface ConsumoMaterialRow {
  id: string
  numero: string
  postoGrad: string
  nip: string
  nome: string
  iniciais: string
  data: string
  idade: string
  diagnostico: string
  cid: string
  procedimento: string
  materiais: string
  et: string
  fornecedor: string
  cirurgiao: string
  mapaSala: string
  mapa: string
  ref: string
  safin: string
  empenho: string
  danfe: string
  valor: string
  valorNumerico: number
  ata: string
  /** Campos do modelo IHM PME (setor medicamento) */
  itemPme: string
  qtd: string
  valorUnitario: string
  nipTitular: string
  vinculo: string
  pctIndenizar: string
  om: string
  unidadeFornecimento: string
  quantidadeAdquirida: string
  maneiraDispensacao: string
  valorIndenizar: string
  qtdFornecidaOse: string
  maneiraFornecimento: string
}

export type ConsumoMaterialHeader = {
  key: keyof ConsumoMaterialRow
  label: string
  group: string
  width: number
}

export const CONSUMO_MATERIAL_HEADERS: readonly ConsumoMaterialHeader[] = [
  { key: 'numero', label: 'Nº', group: 'paciente', width: 56 },
  { key: 'postoGrad', label: 'P/GRAD', group: 'paciente', width: 88 },
  { key: 'nip', label: 'NIP', group: 'paciente', width: 108 },
  { key: 'nome', label: 'NOME', group: 'paciente', width: 200 },
  { key: 'iniciais', label: 'INICIAIS', group: 'paciente', width: 72 },
  { key: 'data', label: 'DATA', group: 'paciente', width: 88 },
  { key: 'idade', label: 'ID', group: 'paciente', width: 72 },
  { key: 'diagnostico', label: 'DIAGNÓSTICO', group: 'clinico', width: 220 },
  { key: 'cid', label: 'CID', group: 'clinico', width: 72 },
  { key: 'procedimento', label: 'PROCEDIMENTO', group: 'clinico', width: 240 },
  { key: 'materiais', label: 'MATERIAIS', group: 'clinico', width: 200 },
  { key: 'et', label: 'E/T', group: 'clinico', width: 48 },
  { key: 'fornecedor', label: 'FORNECEDOR', group: 'clinico', width: 120 },
  { key: 'cirurgiao', label: 'CIRURGIÃO', group: 'clinico', width: 140 },
  { key: 'mapaSala', label: 'MAPA DE SALA', group: 'clinico', width: 100 },
  { key: 'mapa', label: 'Mapa', group: 'clinico', width: 120 },
  { key: 'ref', label: 'REF', group: 'financeiro', width: 120 },
  { key: 'safin', label: 'SAFIN', group: 'financeiro', width: 100 },
  { key: 'empenho', label: 'EMPENHO', group: 'financeiro', width: 140 },
  { key: 'danfe', label: 'DANFE', group: 'financeiro', width: 120 },
  { key: 'valor', label: 'VALOR', group: 'financeiro', width: 110 },
  { key: 'ata', label: 'ATA', group: 'financeiro', width: 72 },
  {
    key: 'itemPme',
    label: 'ITEM (PME) — DESCRIÇÃO DO MEDICAMENTO',
    group: 'medicamento',
    width: 280,
  },
  { key: 'qtd', label: 'QTD', group: 'medicamento', width: 56 },
  { key: 'valorUnitario', label: 'VALOR UNITÁRIO', group: 'medicamento', width: 110 },
  { key: 'nipTitular', label: 'NIP TITULAR', group: 'titular', width: 108 },
  { key: 'vinculo', label: 'VINCULO', group: 'titular', width: 100 },
  {
    key: 'pctIndenizar',
    label: '% A INDENIZAR',
    group: 'imh',
    width: 100,
  },
  { key: 'valorIndenizar', label: 'VALOR A INDENIZAR', group: 'imh', width: 130 },
  { key: 'om', label: 'OM', group: 'imh', width: 80 },
  {
    key: 'quantidadeAdquirida',
    label: 'QUANTIDADE ADQUIRIDA PELA OMH/OMFM',
    group: 'imh',
    width: 160,
  },
  {
    key: 'qtdFornecidaOse',
    label: 'QTD FORNECIDA POR OSE',
    group: 'imh',
    width: 140,
  },
  {
    key: 'maneiraFornecimento',
    label: 'MANEIRA DE FORNECIMENTO',
    group: 'imh',
    width: 160,
  },
]

/** Colunas do Modelo IHM — PME (Novo Lançamento do setor medicamento). */
export const CONSUMO_MEDICAMENTO_PME_HEADERS: readonly ConsumoMaterialHeader[] = [
  { key: 'data', label: 'DATA', group: 'paciente', width: 88 },
  { key: 'nip', label: 'NIP', group: 'paciente', width: 108 },
  { key: 'nome', label: 'NOME', group: 'paciente', width: 200 },
  {
    key: 'itemPme',
    label: 'ITEM (PME) — DESCRIÇÃO DO MEDICAMENTO',
    group: 'medicamento',
    width: 280,
  },
  { key: 'qtd', label: 'QTD', group: 'medicamento', width: 56 },
  { key: 'valorUnitario', label: 'VALOR UNITÁRIO', group: 'medicamento', width: 110 },
  { key: 'valor', label: 'TOTAL', group: 'medicamento', width: 110 },
  { key: 'nipTitular', label: 'NIP TITULAR', group: 'titular', width: 108 },
  { key: 'postoGrad', label: 'POSTO/GRAD', group: 'titular', width: 100 },
  { key: 'vinculo', label: 'VINCULO', group: 'titular', width: 100 },
  {
    key: 'pctIndenizar',
    label: '% A INDENIZAR',
    group: 'imh',
    width: 100,
  },
  { key: 'valorIndenizar', label: 'VALOR A INDENIZAR', group: 'imh', width: 130 },
  { key: 'om', label: 'OM', group: 'imh', width: 80 },
  {
    key: 'unidadeFornecimento',
    label: 'UNIDADE DE FORNECIMENTO',
    group: 'imh',
    width: 140,
  },
  {
    key: 'quantidadeAdquirida',
    label: 'QUANTIDADE ADQUIRIDA PELA OMH/OMFM',
    group: 'imh',
    width: 160,
  },
  {
    key: 'qtdFornecidaOse',
    label: 'QTD FORNECIDA POR OSE',
    group: 'imh',
    width: 140,
  },
  {
    key: 'maneiraFornecimento',
    label: 'MANEIRA DE FORNECIMENTO',
    group: 'imh',
    width: 160,
  },
]

const HEADER_TO_FIELD: Record<string, keyof ConsumoMaterialRow> = {
  'Nº': 'numero',
  'P/GRAD': 'postoGrad',
  'POSTO/GRAD': 'postoGrad',
  NIP: 'nip',
  NOME: 'nome',
  INICIAIS: 'iniciais',
  DATA: 'data',
  ID: 'idade',
  DIAGNÓSTICO: 'diagnostico',
  CID: 'cid',
  PROCEDIMENTO: 'procedimento',
  MATERIAIS: 'materiais',
  'E/T': 'et',
  FORNECEDOR: 'fornecedor',
  CIRURGIÃO: 'cirurgiao',
  'MAPA DE SALA': 'mapaSala',
  Mapa: 'mapa',
  REF: 'ref',
  SAFIN: 'safin',
  EMPENHO: 'empenho',
  DANFE: 'danfe',
  VALOR: 'valor',
  TOTAL: 'valor',
  ATA: 'ata',
  'ITEM (PME) — DESCRIÇÃO DO MEDICAMENTO': 'itemPme',
  'ITEM (PME) - DESCRIÇÃO DO MEDICAMENTO': 'itemPme',
  QTD: 'qtd',
  'VALOR UNITÁRIO': 'valorUnitario',
  'VALOR UNITARIO': 'valorUnitario',
  'NIP TITULAR': 'nipTitular',
  VINCULO: 'vinculo',
  VÍNCULO: 'vinculo',
  '% A INDENIZAR': 'pctIndenizar',
  'CALCULADO NO SETOR DE IMH % A INDENIZAR': 'pctIndenizar',
  OM: 'om',
  'UNIDADE DE FORNECIMENTO': 'unidadeFornecimento',
  'QUANTIDADE ADQUIRIDA PELA OMH/OMFM': 'quantidadeAdquirida',
  'MANEIRA DE DISPENSAÇÃO (PELA OMH-OMFM/POR OSE)': 'maneiraDispensacao',
  'MANEIRA DE DISPENSACAO (PELA OMH-OMFM/POR OSE)': 'maneiraDispensacao',
  'VALOR A INDENIZAR': 'valorIndenizar',
  'QTD FORNECIDA POR OSE': 'qtdFornecidaOse',
  'MANEIRA DE FORNECIMENTO': 'maneiraFornecimento',
}

const MAX_COLS = 48
const NIP_PATTERN = /\d{1,2}\.\d{4}\.\d{1,2}/

function decodeXmlText(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
}

/** Converte marcação inline ODS (<text:s/>, etc.) em texto limpo. */
function stripOdsInlineMarkup(raw: string): string {
  return raw
    .replace(/<text:s\b([^>]*)\/>/gi, (_all, attrs: string) => {
      const count = Number(attrs.match(/text:c="(\d+)"/i)?.[1] ?? '1')
      return ' '.repeat(Number.isFinite(count) && count > 0 ? Math.min(count, 40) : 1)
    })
    .replace(/<text:s\b[^>]*>\s*<\/text:s>/gi, ' ')
    .replace(/<\/?text:[a-z0-9:-]+\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
}

function extractOdsCellParagraphs(body: string): string {
  const paragraphs = [...body.matchAll(/<text:p[^>]*>([\s\S]*?)<\/text:p>/g)]
  return paragraphs
    .map((p) => {
      // Strip real tags, decode entities, strip de novo (caso &lt;text:s/&gt;)
      let text = stripOdsInlineMarkup(p[1])
      text = decodeXmlText(text)
      text = stripOdsInlineMarkup(text)
      return text.replace(/\s+/g, ' ').trim()
    })
    .filter(Boolean)
    .join(' ')
}

/**
 * Lê células ODS na ordem correta.
 * Importante: tags auto-fechadas (`/>` ou ` />`) e covered-table-cell
 * precisam ocupar coluna — senão DANFE vazia / merges deslocam ITEM→NEB→DESC.
 */
function extractRowTexts(rowXml: string): string[] {
  const cells: string[] = []
  const cellRe =
    /<(table:table-cell|table:covered-table-cell)\b([^>]*?)(\s*\/>|>([\s\S]*?)<\/\1>)/g
  let match: RegExpExecArray | null
  while ((match = cellRe.exec(rowXml))) {
    const isCovered = match[1] === 'table:covered-table-cell'
    const attrs = match[2] || ''
    const body = match[4] || ''
    const repeat = attrs.match(/number-columns-repeated="(\d+)"/)
    const val = isCovered ? '' : extractOdsCellParagraphs(body)
    const rawRepeat = repeat ? parseInt(repeat[1], 10) : 1
    if (cells.length >= MAX_COLS) break
    const remaining = MAX_COLS - cells.length
    const count = Math.min(Math.max(rawRepeat, 1), remaining)
    for (let i = 0; i < count; i += 1) cells.push(val)
  }
  while (cells.length < MAX_COLS) cells.push('')
  return cells.slice(0, MAX_COLS)
}

function parseOdsSheets(xml: string): { nome: string; rows: string[][] }[] {
  const tables = [...xml.matchAll(/<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/g)]
  const sheets: { nome: string; rows: string[][] }[] = []
  tables.forEach((match, index) => {
    const attrs = match[1] ?? ''
    const body = match[2] ?? ''
    const nomeAttr = attrs.match(/table:name="([^"]+)"/)?.[1]
    const nome = decodeXmlText(nomeAttr?.trim() || `Planilha ${index + 1}`)
    // Ignora tabelas internas sem linhas úteis (ex.: filtros embutidos vazios)
    const rowMatches = [...body.matchAll(/<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g)]
    const rows = rowMatches.map((r) => extractRowTexts(r[1]))
    if (rows.length === 0) return
    sheets.push({ nome, rows })
  })
  return sheets
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/N°/g, 'Nº')
    .replace(/[–—−]/g, '-')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .toUpperCase()
}

const NORMALIZED_HEADER_TO_FIELD: Record<string, keyof ConsumoMaterialRow> = Object.fromEntries(
  Object.entries(HEADER_TO_FIELD).map(([header, field]) => [normalizeHeader(header), field]),
) as Record<string, keyof ConsumoMaterialRow>

// Aliases do modelo PME (cabeçalhos longos / calculados)
NORMALIZED_HEADER_TO_FIELD[normalizeHeader('ITEM (PME) — DESCRIÇÃO DO MEDICAMENTO')] = 'itemPme'
NORMALIZED_HEADER_TO_FIELD[normalizeHeader('ITEM (PME) - DESCRICAO DO MEDICAMENTO')] = 'itemPme'
NORMALIZED_HEADER_TO_FIELD[normalizeHeader('CALCULADO NO SETOR DE IMH % A INDENIZAR')] =
  'pctIndenizar'
NORMALIZED_HEADER_TO_FIELD[normalizeHeader('Calculado no setor de IMH % A INDENIZAR')] =
  'pctIndenizar'
NORMALIZED_HEADER_TO_FIELD[normalizeHeader('VALOR A INDENIZAR')] = 'valorIndenizar'
NORMALIZED_HEADER_TO_FIELD[normalizeHeader('QTD FORNECIDA POR OSE')] = 'qtdFornecidaOse'
NORMALIZED_HEADER_TO_FIELD[normalizeHeader('MANEIRA DE FORNECIMENTO')] = 'maneiraFornecimento'

function normalizeSpreadsheetCell(value: string, field?: keyof ConsumoMaterialRow): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (field === 'data') {
    const asSerial = parseFloat(trimmed.replace(',', '.'))
    if (Number.isFinite(asSerial) && asSerial > 30_000 && asSerial < 60_000) {
      const excelEpoch = Date.UTC(1899, 11, 30)
      const date = new Date(excelEpoch + Math.round(asSerial) * 86_400_000)
      const day = String(date.getUTCDate()).padStart(2, '0')
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const year = String(date.getUTCFullYear()).slice(-2)
      return `${day}/${month}/${year}`
    }
  }

  return trimmed
}

function cleanCell(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '***' || trimmed === '-') return ''
  return trimmed
}

export function parseValorBrasileiro(value: string): number {
  const trimmed = value.trim()
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const direct = parseFloat(trimmed)
    if (Number.isFinite(direct)) return direct
  }

  const cleaned = trimmed.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function parsePctIndenizar(raw: string): number {
  const cleaned = raw.trim().replace('%', '').replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > 1) return n / 100
  if (n === 1) return 1
  return n
}

export function calcValorIndenizar(valorTotal: number, pctRaw: string): string {
  const pct = parsePctIndenizar(pctRaw)
  if (valorTotal <= 0 || pct <= 0) return ''
  return formatValorBrasileiro(valorTotal * pct)
}

export function parseDataBrasileira(value: string): string {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return ''
  const [, day, month, yearRaw] = match
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function findHeaderMapping(rows: string[][]): {
  headerIndex: number
  columnMap: Partial<Record<keyof ConsumoMaterialRow, number>>
} {
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i]
    const hasNip = row.some((c) => normalizeHeader(c) === 'NIP')
    const hasNome = row.some((c) => normalizeHeader(c) === 'NOME')
    if (!hasNip || !hasNome) continue

    const columnMap: Partial<Record<keyof ConsumoMaterialRow, number>> = {}
    row.forEach((header, index) => {
      const field = NORMALIZED_HEADER_TO_FIELD[normalizeHeader(header)]
      if (field) columnMap[field] = index
    })
    return { headerIndex: i, columnMap }
  }
  throw new Error(
    'Cabeçalho não reconhecido. Utilize o modelo CONSUMO MATERIAL CONSIGNADO (.ods ou .xlsx).',
  )
}

function isDataRow(cells: string[], nipIndex: number | undefined): boolean {
  if (nipIndex === undefined || nipIndex < 0) return false
  const nip = cells[nipIndex]?.trim() ?? ''
  return NIP_PATTERN.test(nip)
}

function detectColumnOffset(
  cells: string[],
  columnMap: Partial<Record<keyof ConsumoMaterialRow, number>>,
): number {
  const nipIdx = columnMap.nip
  if (nipIdx === undefined) return 0
  if (isDataRow(cells, nipIdx)) return 0
  if (nipIdx > 0 && isDataRow(cells, nipIdx - 1)) return 1
  if (nipIdx > 1 && isDataRow(cells, nipIdx - 2)) return 2
  return 0
}

function rowFromCells(
  cells: string[],
  columnMap: Partial<Record<keyof ConsumoMaterialRow, number>>,
  rowIndex: number,
  columnOffset = 0,
): ConsumoMaterialRow {
  const get = (field: keyof ConsumoMaterialRow): string => {
    const idx = columnMap[field]
    if (idx === undefined) return ''
    const raw = normalizeSpreadsheetCell(cells[idx - columnOffset] ?? '', field)
    return cleanCell(raw)
  }

  const valorRaw = get('valor')
  const valorUnitarioRaw = get('valorUnitario')
  const itemPme = get('itemPme')
  const materiais = get('materiais') || itemPme
  const valorNumerico =
    parseValorBrasileiro(valorRaw) ||
    (() => {
      const qtd = parseInt(get('qtd') || '1', 10) || 1
      const unit = parseValorBrasileiro(valorUnitarioRaw)
      return unit * qtd
    })()

  return {
    id: `row-${rowIndex}`,
    numero: get('numero'),
    postoGrad: get('postoGrad'),
    nip: get('nip'),
    nome: get('nome'),
    iniciais: get('iniciais'),
    data: get('data'),
    idade: get('idade'),
    diagnostico: get('diagnostico'),
    cid: get('cid'),
    procedimento: get('procedimento'),
    materiais,
    et: get('et'),
    fornecedor: get('fornecedor'),
    cirurgiao: get('cirurgiao'),
    mapaSala: get('mapaSala'),
    mapa: get('mapa'),
    ref: get('ref'),
    safin: get('safin'),
    empenho: get('empenho'),
    danfe: get('danfe'),
    valor: valorRaw,
    valorNumerico,
    ata: get('ata'),
    itemPme,
    qtd: get('qtd'),
    valorUnitario: valorUnitarioRaw,
    nipTitular: get('nipTitular') || get('nip'),
    vinculo: get('vinculo'),
    pctIndenizar: get('pctIndenizar'),
    om: get('om'),
    unidadeFornecimento: get('unidadeFornecimento'),
    quantidadeAdquirida: get('quantidadeAdquirida'),
    maneiraDispensacao: get('maneiraDispensacao') || get('maneiraFornecimento'),
    valorIndenizar:
      get('valorIndenizar') || calcValorIndenizar(valorNumerico, get('pctIndenizar')),
    qtdFornecidaOse: get('qtdFornecidaOse'),
    maneiraFornecimento: get('maneiraFornecimento') || get('maneiraDispensacao'),
  }
}

function parseConsumoMaterialRows(tableRows: string[][]): ConsumoMaterialRow[] {
  const { headerIndex, columnMap } = findHeaderMapping(tableRows)
  const nipIndex = columnMap.nip

  let columnOffset = 0
  const dataRows: ConsumoMaterialRow[] = []
  for (let i = headerIndex + 1; i < tableRows.length; i++) {
    const cells = tableRows[i]
    if (!columnOffset) {
      columnOffset = detectColumnOffset(cells, columnMap)
    }
    const effectiveNipIndex =
      nipIndex !== undefined ? nipIndex - columnOffset : undefined
    if (!isDataRow(cells, effectiveNipIndex)) continue
    dataRows.push(rowFromCells(cells, columnMap, dataRows.length + 1, columnOffset))
  }

  if (dataRows.length === 0) {
    throw new Error('Nenhum lançamento válido encontrado na planilha.')
  }

  return dataRows
}

/** Interpreta a grade bruta de uma aba no layout CONSUMO MATERIAL CONSIGNADO. */
export function parseConsumoMaterialFromGrid(tableRows: string[][]): ConsumoMaterialRow[] {
  return parseConsumoMaterialRows(tableRows).map((row, index) => ({
    ...row,
    id: `import-${Date.now()}-${index + 1}-${Math.random().toString(36).slice(2, 7)}`,
  }))
}

function readXlsxSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) =>
    decodeXmlText(match[1]),
  )
}

function readXlsxCellValue(cellXml: string, sharedStrings: string[]): string {
  const type = cellXml.match(/\bt="([^"]+)"/)?.[1]
  const value = cellXml.match(/<v>([^<]*)<\/v>/)?.[1]
  const inline = cellXml.match(/<is><t>([^<]*)<\/t><\/is>/)?.[1]
  if (inline) return decodeXmlText(inline)
  if (type === 's' && value) return sharedStrings[parseInt(value, 10)] ?? value
  return value ?? ''
}

/** Converte letras de coluna Excel (A, B, …, AA) em índice 0-based. */
function xlsxColLettersToIndex(letters: string): number {
  let n = 0
  for (const ch of letters.toUpperCase()) {
    if (ch < 'A' || ch > 'Z') continue
    n = n * 26 + (ch.charCodeAt(0) - 64)
  }
  return Math.max(0, n - 1)
}

/**
 * Lê linhas XLSX respeitando a referência r="B12".
 * Células vazias omitidas no XML não podem encolher o array — senão as
 * colunas seguintes "andam" e misturam paciente/material.
 */
function parseXlsxXml(sheetXml: string, sharedStrings: string[]): string[][] {
  const rowMatches = [...sheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)]
  return rowMatches.map((rowMatch) => {
    const byCol = new Map<number, string>()
    let maxCol = -1
    let sequential = 0

    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1] ?? ''
      const ref = attrs.match(/\br="([A-Za-z]+)(\d+)"/)
      const col = ref ? xlsxColLettersToIndex(ref[1]) : sequential
      byCol.set(col, readXlsxCellValue(cellMatch[0], sharedStrings))
      if (col > maxCol) maxCol = col
      sequential = col + 1
    }

    const width = Math.min(Math.max(MAX_COLS, maxCol + 1), 80)
    return Array.from({ length: width }, (_, i) => byCol.get(i) ?? '')
  })
}

async function readOdsRows(file: File): Promise<string[][]> {
  const sheets = await readOdsSheets(file)
  return sheets[0]?.rows ?? []
}

async function readOdsSheets(file: File): Promise<{ nome: string; rows: string[][] }[]> {
  const buffer = await file.arrayBuffer()
  const unzipped = unzipSync(new Uint8Array(buffer))
  const contentXml = unzipped['content.xml']
  if (!contentXml) throw new Error('Arquivo ODS inválido ou corrompido')

  const xml = new TextDecoder('utf-8').decode(contentXml)
  const sheets = parseOdsSheets(xml)
  if (sheets.length === 0) throw new Error('Nenhuma aba encontrada no arquivo ODS')
  return sheets
}

async function readXlsxRows(file: File): Promise<string[][]> {
  const sheets = await readXlsxSheets(file)
  return sheets[0]?.rows ?? []
}

async function readXlsxSheets(file: File): Promise<{ nome: string; rows: string[][] }[]> {
  const buffer = await file.arrayBuffer()
  const unzipped = unzipSync(new Uint8Array(buffer))
  const workbookXmlBytes = unzipped['xl/workbook.xml']
  if (!workbookXmlBytes) throw new Error('Arquivo XLSX inválido ou corrompido')

  const workbookXml = new TextDecoder('utf-8').decode(workbookXmlBytes)
  const sheetEntries = [...workbookXml.matchAll(/<sheet\b([^>]*?)\/>|<sheet\b([^>]*)><\/sheet>/g)]
  if (sheetEntries.length === 0) throw new Error('Nenhuma aba encontrada no arquivo XLSX')

  const relsBytes = unzipped['xl/_rels/workbook.xml.rels']
  const relsXml = relsBytes ? new TextDecoder('utf-8').decode(relsBytes) : ''
  const relMap = new Map<string, string>()
  for (const rel of relsXml.matchAll(/<Relationship\b([^>]*)\/>/g)) {
    const attrs = rel[1] ?? ''
    const id = attrs.match(/\bId="([^"]+)"/)?.[1]
    const target = attrs.match(/\bTarget="([^"]+)"/)?.[1]
    if (id && target) {
      const normalized = target.replace(/^\.\//, '').replace(/^\/+/, '')
      relMap.set(id, normalized.startsWith('xl/') ? normalized : `xl/${normalized}`)
    }
  }

  const sharedXml = unzipped['xl/sharedStrings.xml']
  const sharedStrings = sharedXml
    ? readXlsxSharedStrings(new TextDecoder('utf-8').decode(sharedXml))
    : []

  const sheets: { nome: string; rows: string[][] }[] = []
  sheetEntries.forEach((entry, index) => {
    const attrs = entry[1] || entry[2] || ''
    const nome = decodeXmlText(attrs.match(/\bname="([^"]+)"/)?.[1]?.trim() || `Planilha ${index + 1}`)
    const rId = attrs.match(/\br:id="([^"]+)"/)?.[1]
    let sheetPath =
      (rId ? relMap.get(rId) : undefined) ??
      `xl/worksheets/sheet${index + 1}.xml`

    if (!unzipped[sheetPath]) {
      const fallback = Object.keys(unzipped).find((key) =>
        key.replace(/\\/g, '/').endsWith(`/sheet${index + 1}.xml`),
      )
      if (fallback) sheetPath = fallback
    }

    const sheetBytes = unzipped[sheetPath]
    if (!sheetBytes) return
    const sheetXml = new TextDecoder('utf-8').decode(sheetBytes)
    const rows = parseXlsxXml(sheetXml, sharedStrings)
    if (rows.length === 0) return
    sheets.push({ nome, rows })
  })

  if (sheets.length === 0) throw new Error('Nenhuma aba com dados encontrada no arquivo XLSX')
  return sheets
}

/** Importa planilha de consumo material (.ods ou .xlsx) */
export async function parseConsumoMaterialFile(file: File): Promise<ConsumoMaterialRow[]> {
  const lowerName = file.name.toLowerCase()
  if (lowerName.endsWith('.ods')) {
    return parseConsumoMaterialRows(await readOdsRows(file))
  }
  if (lowerName.endsWith('.xlsx')) {
    return parseConsumoMaterialRows(await readXlsxRows(file))
  }
  throw new Error('Selecione um arquivo no formato .ods ou .xlsx')
}

/** Lê grade bruta (.ods ou .xlsx) — primeira aba */
export async function parseSpreadsheetGridFile(file: File): Promise<string[][]> {
  const sheets = await parseSpreadsheetSheetsFile(file)
  return sheets[0]?.rows ?? []
}

export interface SpreadsheetSheetImport {
  nome: string
  rows: string[][]
}

/** Lê todas as abas de um arquivo .ods ou .xlsx */
export async function parseSpreadsheetSheetsFile(file: File): Promise<SpreadsheetSheetImport[]> {
  const lowerName = file.name.toLowerCase()
  if (lowerName.endsWith('.ods')) {
    return readOdsSheets(file)
  }
  if (lowerName.endsWith('.xlsx')) {
    return readXlsxSheets(file)
  }
  throw new Error('Selecione um arquivo no formato .ods ou .xlsx')
}

export async function parseConsumoMaterialOds(file: File): Promise<ConsumoMaterialRow[]> {
  return parseConsumoMaterialFile(file)
}

function inferTipoUsuario(postoGrad: string): TipoUsuarioPaciente {
  const p = postoGrad.toUpperCase()
  if (p.includes('DEP')) return 'DEPENDENTE_DIRETO'
  if (p.includes('RES')) return 'MILITAR_DA_RESERVA'
  if (p.includes('PEN')) return 'PENSIONISTA'
  return 'MILITAR'
}

function inferVinculo(postoGrad: string): PacienteVinculo {
  return postoGrad.toUpperCase().includes('DEP') ? 'DEPENDENTE' : 'TITULAR'
}

export function consumoRowsToPedidoInput(
  rows: ConsumoMaterialRow[],
  clinicaNome: string,
  tituloPlanilha?: string,
  destino: 'auditoria' | 'confeccao' | 'imh' = 'auditoria',
): CreatePedidoInput {
  if (rows.length === 1) {
    return consumoRowToPedidoInput(rows[0], clinicaNome)
  }

  const valorTotal = rows.reduce(
    (sum, row) => sum + (row.valorNumerico > 0 ? row.valorNumerico : 0),
    0,
  )
  const fornecedores = [...new Set(rows.map((row) => row.fornecedor.trim()).filter(Boolean))]
  const primeira = rows[0]
  const titulo =
    tituloPlanilha?.trim() ||
    (destino === 'confeccao'
      ? `Planilha Material — ${rows.length} lançamentos`
      : destino === 'imh'
        ? `Planilha IMH — ${rows.length} lançamentos`
        : `Planilha IMH — ${rows.length} lançamentos`)
  const descricaoEnvio =
    destino === 'confeccao'
      ? `Envio de planilha com ${rows.length} lançamentos para Confecção de Solemp.`
      : destino === 'imh'
        ? `Envio de planilha com ${rows.length} lançamentos diretamente para Contabilidade/IMH.`
        : `Envio de planilha com ${rows.length} lançamentos para auditoria.`

  return {
    consumoRowIds: rows.map((row) => row.id),
    paciente: {
      nome: titulo,
      vinculo: 'TITULAR',
      nip: '—',
      nipTitular: '—',
      nomeTitular: titulo,
      tipoUsuario: 'MILITAR',
    },
    dadosClinica: {
      nomeClinica: clinicaNome,
      medico: '—',
      procedimento: `Lote com ${rows.length} lançamentos`,
      dataCirurgia: new Date().toISOString().slice(0, 10),
      empresaConsignada: fornecedores[0] || primeira?.fornecedor || '—',
      pregao: primeira?.ref || '—',
      materialUtilizado: `${rows.length} itens na planilha enviada`,
      quantidade: rows.length,
      valorUnitario: valorTotal > 0 ? valorTotal / rows.length : 0.01,
      valorTotal: valorTotal > 0 ? valorTotal : 0.01 * rows.length,
      folhaSala: '',
      descricaoCirurgica: descricaoEnvio,
      etiquetas: '',
      fotos: [],
    },
  }
}

export function consumoRowToPedidoInput(
  row: ConsumoMaterialRow,
  clinicaNome: string,
): CreatePedidoInput {
  const vinculo = inferVinculo(row.postoGrad)
  const tipoUsuario = inferTipoUsuario(row.postoGrad)
  const nip = formatNip(row.nip)
  const valor = row.valorNumerico > 0 ? row.valorNumerico : 0.01
  const isTitular = vinculo === 'TITULAR'
  const descricao = [row.diagnostico, row.cid ? `CID ${row.cid}` : '']
    .filter(Boolean)
    .join(' — ')
  const folhaSala = [row.mapaSala, row.mapa].filter(Boolean).join(' / ')
  const pregao = [row.ref, row.mapa].filter(Boolean).join(' ') || row.safin || '—'
  const etiquetas = [row.et, row.danfe, row.empenho, row.ata].filter(Boolean).join(' | ')

  return {
    paciente: {
      nome: row.nome,
      vinculo,
      nip,
      nipTitular: nip,
      nomeTitular: isTitular ? row.nome : '',
      tipoUsuario,
    },
    dadosClinica: {
      nomeClinica: clinicaNome,
      medico: row.cirurgiao || '—',
      procedimento: row.procedimento || '—',
      dataCirurgia: parseDataBrasileira(row.data) || new Date().toISOString().slice(0, 10),
      empresaConsignada: row.fornecedor || '—',
      pregao,
      materialUtilizado: row.materiais || '—',
      quantidade: 1,
      valorUnitario: valor,
      valorTotal: valor,
      folhaSala,
      descricaoCirurgica: descricao,
      etiquetas,
      fotos: [],
    },
  }
}

export function formatValorBrasileiro(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export type ManualRowFormData = {
  numero: string
  postoGrad: string
  nip: string
  nome: string
  iniciais: string
  data: string
  idade: string
  diagnostico: string
  cid: string
  procedimento: string
  materiais: string
  et: string
  fornecedor: string
  cirurgiao: string
  mapaSala: string
  mapa: string
  ref: string
  safin: string
  empenho: string
  danfe: string
  valor: string
  ata: string
  itemPme: string
  qtd: string
  valorUnitario: string
  nipTitular: string
  vinculo: string
  pctIndenizar: string
  om: string
  unidadeFornecimento: string
  quantidadeAdquirida: string
  maneiraDispensacao: string
  valorIndenizar: string
  qtdFornecidaOse: string
  maneiraFornecimento: string
}

export const EMPTY_MANUAL_ROW: ManualRowFormData = {
  numero: '',
  postoGrad: '',
  nip: '',
  nome: '',
  iniciais: '',
  data: '',
  idade: '',
  diagnostico: '',
  cid: '',
  procedimento: '',
  materiais: '',
  et: '',
  fornecedor: '',
  cirurgiao: '',
  mapaSala: '',
  mapa: '',
  ref: '',
  safin: '',
  empenho: '',
  danfe: '',
  valor: '',
  ata: '',
  itemPme: '',
  qtd: '',
  valorUnitario: '',
  nipTitular: '',
  vinculo: '',
  pctIndenizar: '',
  om: '',
  unidadeFornecimento: '',
  quantidadeAdquirida: '',
  maneiraDispensacao: '',
  valorIndenizar: '',
  qtdFornecidaOse: '',
  maneiraFornecimento: '',
}

export function buildConsumoRowFromManual(data: ManualRowFormData, id: string): ConsumoMaterialRow {
  const qtd = parseInt(data.qtd.trim() || '1', 10) || 1
  const unitRaw = data.valorUnitario.trim()
  const totalRaw = data.valor.trim()
  const unitValue = parseValorBrasileiro(unitRaw)
  const totalFromField = parseValorBrasileiro(totalRaw)
  const valorNumerico =
    totalFromField > 0 ? totalFromField : unitValue > 0 ? unitValue * qtd : 0
  const valorFormatado =
    totalRaw.startsWith('R$') || !valorNumerico
      ? totalRaw || (valorNumerico > 0 ? formatValorBrasileiro(valorNumerico) : '')
      : formatValorBrasileiro(valorNumerico)
  const valorUnitarioFormatado =
    unitRaw.startsWith('R$') || !unitValue
      ? unitRaw ||
        (valorNumerico > 0 && qtd > 0
          ? formatValorBrasileiro(valorNumerico / qtd)
          : '')
      : formatValorBrasileiro(unitValue)
  const itemPme = data.itemPme.trim() || data.materiais.trim()
  const nip = formatNip(data.nip.trim())
  const nipTitular = formatNip(data.nipTitular.trim() || data.nip.trim())

  return {
    id,
    numero: data.numero.trim(),
    postoGrad: data.postoGrad.trim(),
    nip,
    nome: data.nome.trim(),
    iniciais: data.iniciais.trim(),
    data: data.data.trim(),
    idade: data.idade.trim(),
    diagnostico: data.diagnostico.trim(),
    cid: data.cid.trim(),
    procedimento: data.procedimento.trim(),
    materiais: data.materiais.trim() || itemPme,
    et: data.et.trim(),
    fornecedor: data.fornecedor.trim(),
    cirurgiao: data.cirurgiao.trim(),
    mapaSala: data.mapaSala.trim(),
    mapa: data.mapa.trim(),
    ref: data.ref.trim(),
    safin: data.safin.trim(),
    empenho: data.empenho.trim(),
    danfe: data.danfe.trim(),
    valor: valorFormatado || data.valor.trim(),
    valorNumerico,
    ata: data.ata.trim(),
    itemPme,
    qtd: data.qtd.trim() || (valorNumerico > 0 ? '1' : ''),
    valorUnitario: valorUnitarioFormatado,
    nipTitular,
    vinculo: data.vinculo.trim(),
    pctIndenizar: data.pctIndenizar.trim(),
    om: data.om.trim(),
    unidadeFornecimento: data.unidadeFornecimento.trim(),
    quantidadeAdquirida: data.quantidadeAdquirida.trim(),
    maneiraDispensacao: data.maneiraDispensacao.trim() || data.maneiraFornecimento.trim(),
    valorIndenizar:
      data.valorIndenizar.trim() || calcValorIndenizar(valorNumerico, data.pctIndenizar),
    qtdFornecidaOse: data.qtdFornecidaOse.trim(),
    maneiraFornecimento: data.maneiraFornecimento.trim() || data.maneiraDispensacao.trim(),
  }
}

export function consumoMaterialRowToManual(row: ConsumoMaterialRow): ManualRowFormData {
  return {
    numero: row.numero ?? '',
    postoGrad: row.postoGrad ?? '',
    nip: row.nip ?? '',
    nome: row.nome ?? '',
    iniciais: row.iniciais ?? '',
    data: row.data ?? '',
    idade: row.idade ?? '',
    diagnostico: row.diagnostico ?? '',
    cid: row.cid ?? '',
    procedimento: row.procedimento ?? '',
    materiais: row.materiais ?? '',
    et: row.et ?? '',
    fornecedor: row.fornecedor ?? '',
    cirurgiao: row.cirurgiao ?? '',
    mapaSala: row.mapaSala ?? '',
    mapa: row.mapa ?? '',
    ref: row.ref ?? '',
    safin: row.safin ?? '',
    empenho: row.empenho ?? '',
    danfe: row.danfe ?? '',
    valor: row.valor ?? '',
    ata: row.ata ?? '',
    itemPme: row.itemPme ?? '',
    qtd: row.qtd ?? '',
    valorUnitario: row.valorUnitario ?? '',
    nipTitular: row.nipTitular ?? '',
    vinculo: row.vinculo ?? '',
    pctIndenizar: row.pctIndenizar ?? '',
    om: row.om ?? '',
    unidadeFornecimento: row.unidadeFornecimento ?? '',
    quantidadeAdquirida: row.quantidadeAdquirida ?? '',
    maneiraDispensacao: row.maneiraDispensacao ?? row.maneiraFornecimento ?? '',
    valorIndenizar: row.valorIndenizar ?? '',
    qtdFornecidaOse: row.qtdFornecidaOse ?? '',
    maneiraFornecimento: row.maneiraFornecimento ?? row.maneiraDispensacao ?? '',
  }
}

export function normalizeConsumoMaterialRows(
  rows: ConsumoMaterialRow[] | undefined,
): ConsumoMaterialRow[] {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((row) => row && typeof row === 'object')
    .map((row, index) => ({
      ...buildConsumoRowFromManual(consumoMaterialRowToManual(row as ConsumoMaterialRow), row.id || `consumo-${index + 1}`),
      numero: row.numero || String(index + 1),
    }))
}

export const MANUAL_ROW_EXAMPLE: ManualRowFormData = {
  numero: '1',
  postoGrad: 'MN',
  nip: '24.1118.21',
  nome: 'LUIZ PHILIPE SANTANA SILVA',
  iniciais: 'LPSS',
  data: '03/01/26',
  idade: '19 ANOS',
  diagnostico: 'FRATURA DO MALEOLO POSTERIOR ESQUERDO',
  cid: 'S82.5',
  procedimento: 'OSTEOSSINTESE DO TORNOZELO ESQUERDO',
  materiais: '02 PARAFUSOS HCS',
  et: 'T',
  fornecedor: 'RPM',
  cirurgiao: 'FRANKEN',
  mapaSala: '156',
  mapa: 'M-36/25',
  ref: 'PE 79/24 COMRJ',
  safin: '65720-1943/2025',
  empenho: '2025NE4451',
  danfe: '211419/ 211417/ 211424/ 211457',
  valor: 'R$ 5.171,00',
  ata: '15/25',
  itemPme: '',
  qtd: '',
  valorUnitario: '',
  nipTitular: '',
  vinculo: '',
  pctIndenizar: '',
  om: '',
  unidadeFornecimento: '',
  quantidadeAdquirida: '',
  maneiraDispensacao: '',
  valorIndenizar: '',
  qtdFornecidaOse: '',
  maneiraFornecimento: '',
}

/** Exemplo alinhado às colunas do Modelo IHM — PME (medicamento). */
export const MANUAL_ROW_EXAMPLE_MEDICAMENTO: ManualRowFormData = {
  ...EMPTY_MANUAL_ROW,
  data: '03/01/26',
  nip: '24.1118.21',
  nome: 'LUIZ PHILIPE SANTANA SILVA',
  itemPme: 'ABATACEPTE 125MG/ML SERINGA',
  qtd: '2',
  valorUnitario: 'R$ 1.029,46',
  valor: 'R$ 2.058,92',
  nipTitular: '24.1118.21',
  postoGrad: 'MN',
  vinculo: 'TITULAR',
  pctIndenizar: '100%',
  om: 'HNMD',
  unidadeFornecimento: 'SE',
  quantidadeAdquirida: '1000',
  maneiraDispensacao: 'PELA OMH',
  valorIndenizar: 'R$ 2.058,92',
  qtdFornecidaOse: '',
  maneiraFornecimento: 'PELA OMH',
}
