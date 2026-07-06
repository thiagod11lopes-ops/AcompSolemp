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
}

export const CONSUMO_MATERIAL_HEADERS = [
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
] as const

const HEADER_TO_FIELD: Record<string, keyof ConsumoMaterialRow> = {
  'Nº': 'numero',
  'P/GRAD': 'postoGrad',
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
  ATA: 'ata',
}

const MAX_COLS = 24
const NIP_PATTERN = /\d{1,2}\.\d{4}\.\d{1,2}/

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
    const val = decodeXmlText(
      paragraphs.map((p) => p[1]).join(' ').trim(),
    )
    const count = repeat ? Math.min(parseInt(repeat[1], 10), MAX_COLS) : 1
    for (let i = 0; i < count; i++) cells.push(val)
  }
  return cells.slice(0, MAX_COLS)
}

function parseOdsXml(xml: string): string[][] {
  const rows = [...xml.matchAll(/<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g)]
  return rows.map((r) => extractRowTexts(r[1]))
}

function cleanCell(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '***' || trimmed === '-') return ''
  return trimmed
}

export function parseValorBrasileiro(value: string): number {
  const cleaned = value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
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
    const hasNip = row.some((c) => c.trim() === 'NIP')
    const hasNome = row.some((c) => c.trim() === 'NOME')
    if (!hasNip || !hasNome) continue

    const columnMap: Partial<Record<keyof ConsumoMaterialRow, number>> = {}
    row.forEach((header, index) => {
      const field = HEADER_TO_FIELD[header.trim()]
      if (field) columnMap[field] = index
    })
    return { headerIndex: i, columnMap }
  }
  throw new Error(
    'Cabeçalho não reconhecido. Utilize o modelo CONSUMO MATERIAL CONSIGNADO (.ods).',
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
    return cleanCell(cells[idx - columnOffset] ?? '')
  }

  const valorRaw = get('valor')
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
    materiais: get('materiais'),
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
    valorNumerico: parseValorBrasileiro(valorRaw),
    ata: get('ata'),
  }
}

export async function parseConsumoMaterialOds(file: File): Promise<ConsumoMaterialRow[]> {
  if (!file.name.toLowerCase().endsWith('.ods')) {
    throw new Error('Selecione um arquivo no formato .ods')
  }

  const buffer = await file.arrayBuffer()
  const unzipped = unzipSync(new Uint8Array(buffer))
  const contentXml = unzipped['content.xml']
  if (!contentXml) throw new Error('Arquivo ODS inválido ou corrompido')

  const xml = new TextDecoder('utf-8').decode(contentXml)
  const tableRows = parseOdsXml(xml)
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
}

export function buildConsumoRowFromManual(data: ManualRowFormData, id: string): ConsumoMaterialRow {
  const valorNumerico = parseValorBrasileiro(data.valor)
  const valorFormatado =
    data.valor.trim().startsWith('R$') || !valorNumerico
      ? data.valor.trim()
      : formatValorBrasileiro(valorNumerico)

  return {
    id,
    numero: data.numero.trim(),
    postoGrad: data.postoGrad.trim(),
    nip: formatNip(data.nip.trim()),
    nome: data.nome.trim(),
    iniciais: data.iniciais.trim(),
    data: data.data.trim(),
    idade: data.idade.trim(),
    diagnostico: data.diagnostico.trim(),
    cid: data.cid.trim(),
    procedimento: data.procedimento.trim(),
    materiais: data.materiais.trim(),
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
  }
}

export const MANUAL_ROW_EXAMPLE: ManualRowFormData = {
  numero: '1',
  postoGrad: 'MN',
  nip: '24.1118.21',
  nome: 'LUIZ PHILIPE SANTANA SILVA',
  iniciais: 'LPSS',
  data: '03/01/25',
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
}
