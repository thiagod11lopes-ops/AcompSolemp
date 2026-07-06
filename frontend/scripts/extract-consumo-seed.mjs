/**
 * Regenera frontend/src/data/consumoMaterialSeed.json a partir dos modelos OPME TRO.
 * Uso: node scripts/extract-consumo-seed.mjs
 */
import fs from 'fs'
import path from 'path'
import { unzipSync } from 'fflate'

const MODEL_DIR = process.env.OPME_MODEL_DIR ?? 'C:/Users/DELL/Downloads/MODELO OPME TRO'
const OUT = new URL('../src/data/consumoMaterialSeed.json', import.meta.url)

const MAX_COLS = 24
const NIP_PATTERN = /\d{1,2}\.\d{4}\.\d{1,2}/

const HEADER_TO_FIELD = {
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

function decodeXmlText(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
}

function extractRowTexts(rowXml) {
  const cells = []
  const cellRe =
    /<table:table-cell([^>]*)>([\s\S]*?)<\/table:table-cell>|<table:table-cell([^>]*)\/>/g
  let match
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

function parseValor(value) {
  const cleaned = value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function cleanCell(value) {
  const t = value.trim()
  if (!t || t === '***' || t === '-') return ''
  return t
}

function findHeaderMapping(rows) {
  for (let i = 0; i < Math.min(60, rows.length); i++) {
    const row = rows[i]
    if (!row.some((c) => c.trim() === 'NIP') || !row.some((c) => c.trim() === 'NOME')) continue
    const columnMap = {}
    row.forEach((header, index) => {
      const field = HEADER_TO_FIELD[header.trim()]
      if (field) columnMap[field] = index
    })
    return { headerIndex: i, columnMap }
  }
  return null
}

function isDataRow(cells, nipIndex) {
  if (nipIndex === undefined || nipIndex < 0) return false
  return NIP_PATTERN.test(cells[nipIndex]?.trim() ?? '')
}

function detectOffset(cells, columnMap) {
  const nipIdx = columnMap.nip
  if (nipIdx === undefined) return 0
  if (isDataRow(cells, nipIdx)) return 0
  if (nipIdx > 0 && isDataRow(cells, nipIdx - 1)) return 1
  return 0
}

function rowFromCells(cells, columnMap, id, offset = 0) {
  const get = (field) => {
    const idx = columnMap[field]
    if (idx === undefined) return ''
    return cleanCell(cells[idx - offset] ?? '')
  }
  const valorRaw = get('valor')
  return {
    id,
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
    valorNumerico: parseValor(valorRaw),
    ata: get('ata'),
  }
}

function parseOdsFile(filePath, mesId) {
  const xml = new TextDecoder().decode(unzipSync(fs.readFileSync(filePath))['content.xml'])
  const tableRows = [...xml.matchAll(/<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g)].map(
    (r) => extractRowTexts(r[1]),
  )
  const mapping = findHeaderMapping(tableRows)
  if (!mapping) return []

  const { headerIndex, columnMap } = mapping
  const nipIndex = columnMap.nip
  let columnOffset = 0
  const dataRows = []

  for (let i = headerIndex + 1; i < tableRows.length; i++) {
    const cells = tableRows[i]
    if (!columnOffset) columnOffset = detectOffset(cells, columnMap)
    const effectiveNipIndex = nipIndex !== undefined ? nipIndex - columnOffset : undefined
    if (!isDataRow(cells, effectiveNipIndex)) continue
    dataRows.push(rowFromCells(cells, columnMap, `${mesId}-${dataRows.length + 1}`, columnOffset))
  }
  return dataRows
}

const files = fs
  .readdirSync(MODEL_DIR)
  .filter((f) => /^0[1-6]-26.*DEFINITIVA\.ods$/i.test(f))
  .sort()

const allRows = []
for (const file of files) {
  const match = file.match(/^(\d{2})-(\d{2})/)
  const id = match ? `${match[1]}-${match[2]}` : file
  const rows = parseOdsFile(path.join(MODEL_DIR, file), id)
  console.log(file, '->', rows.length, 'rows')
  allRows.push(...rows)
}

fs.writeFileSync(OUT, JSON.stringify(allRows))
console.log('Total rows:', allRows.length, '->', OUT.pathname)
