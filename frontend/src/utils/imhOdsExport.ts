import { unzipSync, zipSync, type Zippable } from 'fflate'
import {
  calcularTotalImh,
  type ImhCabecalho,
  type ImhLinha,
  type ImhPlanilha,
} from '@/utils/imhPlanilhaTemplate'

const IMH_TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/IMH.ods`
const HEADER_ROW_COUNT = 6
const FOOTER_START_INDEX = 19

const ROW_TRAIL =
  '<table:table-cell table:style-name="ce6"/><table:table-cell table:style-name="ce22"/><table:table-cell table:number-columns-repeated="16368"/>'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function replaceNthTextP(rowXml: string, index: number, text: string): string {
  let count = 0
  return rowXml.replace(/<text:p>([\s\S]*?)<\/text:p>/g, (match) => {
    count++
    if (count === index) return `<text:p>${escapeXml(text)}</text:p>`
    return match
  })
}

function patchHeaderRow1(rowXml: string, cabecalho: ImhCabecalho): string {
  let row = rowXml
  if (cabecalho.numeroRelacao) row = replaceNthTextP(row, 2, cabecalho.numeroRelacao)
  if (cabecalho.pregaoTad) row = replaceNthTextP(row, 4, cabecalho.pregaoTad)
  return row
}

function patchHeaderRow2(rowXml: string, cabecalho: ImhCabecalho): string {
  if (!cabecalho.data) return rowXml
  return replaceNthTextP(rowXml, 2, cabecalho.data)
}

function patchHeaderRow3(rowXml: string, cabecalho: ImhCabecalho): string {
  let row = rowXml
  if (cabecalho.processo) row = replaceNthTextP(row, 2, cabecalho.processo)
  if (cabecalho.fornecedor) row = replaceNthTextP(row, 4, cabecalho.fornecedor)
  return row
}

function formatTotalOds(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function patchTotalRow(rowXml: string, total: number): string {
  const formatted = formatTotalOds(total)
  return rowXml
    .replace(/office:formula="[^"]*"/g, '')
    .replace(/<text:p>[^<]*<text:s\/><\/text:p>/g, `<text:p>${formatted}<text:s/></text:p>`)
}

function strCell(text: string, style: string, rowspan?: number): string {
  const spanAttr = rowspan ? ` table:number-rows-spanned="${rowspan}"` : ''
  return `<table:table-cell office:value-type="string" table:number-columns-spanned="1"${spanAttr} table:style-name="${style}"><text:p>${escapeXml(text)}</text:p></table:table-cell>`
}

function buildFirstPatientRow(linha: ImhLinha, materialCount: number, subtotal: string): string {
  const span = Math.max(materialCount, 1)
  let row = '<table:table-row table:style-name="ro3">'
  row += strCell(linha.numero, 'ce35', span)
  row += strCell(linha.nip, 'ce36', span)
  row += strCell(linha.iniciais, 'ce36', span)
  row += strCell(linha.data, 'ce37', span)
  row += strCell(linha.procedimento, 'ce38', span)
  row += strCell(linha.mapaSala, 'ce39', span)
  row += `<table:table-cell table:number-columns-spanned="1" table:number-rows-spanned="${span}" table:style-name="ce31"><text:p>${escapeXml(linha.danfe)}</text:p></table:table-cell>`
  row += strCell(linha.item, 'ce16')
  row += strCell(linha.nebPi, 'ce17')
  row += strCell(linha.descricaoMaterial, 'ce18')
  row += strCell(linha.qt || '1', 'ce19')
  row += strCell(linha.valorUnit, 'ce20')
  row += strCell(linha.valorTotal, 'ce21')
  row += `<table:table-cell office:value-type="string" table:number-columns-spanned="1" table:number-rows-spanned="${span}" table:style-name="ce40"><text:p>${escapeXml(subtotal)}<text:s/></text:p></table:table-cell>`
  row += ROW_TRAIL
  row += '</table:table-row>'
  return row
}

function buildContinuationRow(linha: ImhLinha): string {
  let row = '<table:table-row table:style-name="ro3">'
  row += '<table:covered-table-cell/>'.repeat(7)
  row += strCell(linha.item, 'ce16')
  row += strCell(linha.nebPi, 'ce17')
  row += strCell(linha.descricaoMaterial, 'ce18')
  row += strCell(linha.qt || '1', 'ce19')
  row += strCell(linha.valorUnit, 'ce20')
  row += strCell(linha.valorTotal, 'ce21')
  row += '<table:covered-table-cell/>'
  row += ROW_TRAIL
  row += '</table:table-row>'
  return row
}

function groupLinhas(linhas: ImhLinha[]): ImhLinha[][] {
  const ordem: string[] = []
  const map = new Map<string, ImhLinha[]>()
  for (const linha of linhas) {
    if (!map.has(linha.pacienteGrupoId)) {
      ordem.push(linha.pacienteGrupoId)
      map.set(linha.pacienteGrupoId, [])
    }
    map.get(linha.pacienteGrupoId)!.push(linha)
  }
  return ordem.map((id) => map.get(id)!)
}

function parseValorLinha(valor: string): number {
  const cleaned = valor.replace(/[R$\s.]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function buildDataRowsXml(linhas: ImhLinha[]): string {
  const grupos = groupLinhas(linhas)
  let xml = ''
  for (const grupo of grupos) {
    const subtotalNum = grupo.reduce((sum, l) => sum + parseValorLinha(l.valorTotal), 0)
    const subtotal = formatTotalOds(subtotalNum)
    grupo.forEach((linha, idx) => {
      if (idx === 0) {
        xml += buildFirstPatientRow(linha, grupo.length, subtotal)
      } else {
        xml += buildContinuationRow(linha)
      }
    })
  }
  return xml
}

function extractTableRows(xml: string): string[] {
  return [...xml.matchAll(/<table:table-row[^>]*>[\s\S]*?<\/table:table-row>/g)].map((m) => m[0])
}

export async function generateImhOdsBlob(planilha: ImhPlanilha): Promise<Blob> {
  const response = await fetch(IMH_TEMPLATE_URL)
  if (!response.ok) throw new Error('Modelo IMH.ods não encontrado.')
  const templateBuf = new Uint8Array(await response.arrayBuffer())
  const files = unzipSync(templateBuf) as Record<string, Uint8Array>

  const xml = new TextDecoder().decode(files['content.xml'])
  const rows = extractTableRows(xml)

  if (rows.length < FOOTER_START_INDEX + 1) {
    throw new Error('Modelo IMH.ods inválido.')
  }

  rows[0] = patchHeaderRow1(rows[0], planilha.cabecalho)
  rows[1] = patchHeaderRow2(rows[1], planilha.cabecalho)
  rows[2] = patchHeaderRow3(rows[2], planilha.cabecalho)

  const dataXml = buildDataRowsXml(planilha.linhas)
  const total = calcularTotalImh(planilha.linhas)
  const totalRow = patchTotalRow(rows[FOOTER_START_INDEX - 1], total)

  const oldDataSection = rows.slice(HEADER_ROW_COUNT, FOOTER_START_INDEX).join('')
  const newXml = xml.replace(oldDataSection, dataXml + totalRow)

  if (newXml === xml) {
    throw new Error('Falha ao montar planilha IMH.')
  }

  const updatedFiles: Zippable = {}
  for (const [name, data] of Object.entries(files)) {
    updatedFiles[name] = name === 'content.xml' ? new TextEncoder().encode(newXml) : data
  }

  const zipped = zipSync(updatedFiles, { level: 6 })
  return new Blob([zipped], { type: 'application/vnd.oasis.opendocument.spreadsheet' })
}

export async function downloadImhOds(planilha: ImhPlanilha, fileName?: string): Promise<void> {
  const blob = await generateImhOdsBlob(planilha)
  const nome =
    fileName ??
    `IMH-${planilha.cabecalho.numeroRelacao.replace(/\//g, '-') || 'planilha'}.ods`
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = nome
  anchor.click()
  URL.revokeObjectURL(url)
}

export function buildImhPlanilhaExport(
  cabecalho: ImhCabecalho,
  linhas: ImhLinha[],
): ImhPlanilha {
  return { cabecalho, linhas }
}

export function getImhExportFileName(cabecalho: ImhCabecalho): string {
  const ref = cabecalho.numeroRelacao.replace(/\//g, '-') || 'planilha'
  return `IMH-${ref}.ods`
}
