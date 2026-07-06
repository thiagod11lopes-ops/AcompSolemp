import { unzipSync, zipSync, type Zippable } from 'fflate'
import type { ImhCabecalho } from '@/utils/imhPlanilhaTemplate'
import type { ImhXlsxLinha } from '@/utils/imhXlsxLinha'
import { getImhXlsxFileName } from '@/utils/imhXlsxLinha'

const IMH_XLSX_TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/Planilha-IMH.xlsx`
const HEADER_ROW_COUNT = 4
const EMPTY_ROWS_AFTER_DATA = 4

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function dataBrasileiraParaExcelSerial(data: string): number {
  const match = data.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return 0
  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  let year = parseInt(match[3], 10)
  if (year < 100) year += 2000
  const utc = Date.UTC(year, month - 1, day)
  const excelEpoch = Date.UTC(1899, 11, 30)
  return Math.round((utc - excelEpoch) / 86400000)
}

function inlineCell(ref: string, style: number, text: string): string {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${escapeXml(text)}</t></is></c>`
}

function numCell(ref: string, style: number, value: number): string {
  const rounded = Math.round(value * 100) / 100
  return `<c r="${ref}" s="${style}"><v>${rounded}</v></c>`
}

function emptyCell(ref: string, style: number): string {
  return `<c r="${ref}" s="${style}"/>`
}

function patchHeaderRow2(rowXml: string, numeroCp: string): string {
  const cp = numeroCp.trim() || '25/2026'
  return rowXml.replace(
    /<c r="I2"[^>]*\/>|<c r="I2"[^>]*>[\s\S]*?<\/c>/,
    inlineCell('I2', 4, cp),
  )
}

function buildDataRow(rowNum: number, linha: ImhXlsxLinha): string {
  const serial = dataBrasileiraParaExcelSerial(linha.data)
  return (
    `<row r="${rowNum}" spans="1:10" ht="43.5" customHeight="1">` +
    numCell(`A${rowNum}`, 11, serial) +
    inlineCell(`B${rowNum}`, 12, linha.nip) +
    inlineCell(`C${rowNum}`, 13, linha.nome) +
    inlineCell(`D${rowNum}`, 14, linha.vinculo) +
    inlineCell(`E${rowNum}`, 15, linha.descricao) +
    inlineCell(`F${rowNum}`, 14, linha.nipTitular) +
    numCell(`G${rowNum}`, 16, linha.valorUnit) +
    numCell(`H${rowNum}`, 17, linha.quantidade) +
    numCell(`I${rowNum}`, 16, linha.valorTotal) +
    emptyCell(`J${rowNum}`, 18) +
    '</row>'
  )
}

function buildEmptyRow(rowNum: number): string {
  return `<row r="${rowNum}" spans="1:10"><c r="A${rowNum}" s="20"/><c r="F${rowNum}" s="20"/><c r="J${rowNum}" s="20"/></row>`
}

function buildFooterRow(rowNum: number): string {
  return (
    `<row r="${rowNum}" spans="1:10" ht="15.75">` +
    emptyCell(`A${rowNum}`, 20) +
    inlineCell(`E${rowNum}`, 21, 'Chefe da Clínica') +
    emptyCell(`F${rowNum}`, 21) +
    emptyCell(`G${rowNum}`, 21) +
    emptyCell(`H${rowNum}`, 21) +
    emptyCell(`J${rowNum}`, 20) +
    '</row>'
  )
}

function extractRows(sheetXml: string): string[] {
  return [...sheetXml.matchAll(/<row r="\d+"[^>]*>[\s\S]*?<\/row>/g)].map((m) => m[0])
}

function rebuildSheetXml(sheetXml: string, linhas: ImhXlsxLinha[], cabecalho: ImhCabecalho): string {
  const templateRows = extractRows(sheetXml)
  if (templateRows.length < HEADER_ROW_COUNT + 1) {
    throw new Error('Modelo Planilha IMH.xlsx inválido.')
  }

  const headerRows = templateRows.slice(0, HEADER_ROW_COUNT)
  headerRows[1] = patchHeaderRow2(headerRows[1], cabecalho.numeroRelacao)

  const dataRows = linhas.map((linha, index) => buildDataRow(HEADER_ROW_COUNT + 1 + index, linha))
  const emptyStart = HEADER_ROW_COUNT + 1 + linhas.length
  const emptyRows = Array.from({ length: EMPTY_ROWS_AFTER_DATA }, (_, index) =>
    buildEmptyRow(emptyStart + index),
  )
  const footerRow = emptyStart + EMPTY_ROWS_AFTER_DATA
  const footer = buildFooterRow(footerRow)

  const sheetData = headerRows.join('') + dataRows.join('') + emptyRows.join('') + footer

  return sheetXml
    .replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData>${sheetData}</sheetData>`)
    .replace(/<dimension ref="[^"]*"/, `<dimension ref="A1:J${footerRow}"`)
    .replace(/<mergeCell ref="E11:H11"\/>/, `<mergeCell ref="E${footerRow}:H${footerRow}"/>`)
}

export async function generateImhXlsxBlob(
  linhas: ImhXlsxLinha[],
  cabecalho: ImhCabecalho,
): Promise<Blob> {
  if (linhas.length === 0) throw new Error('Nenhum lançamento para exportar.')

  const response = await fetch(IMH_XLSX_TEMPLATE_URL)
  if (!response.ok) throw new Error('Modelo Planilha IMH.xlsx não encontrado.')

  const templateBuf = new Uint8Array(await response.arrayBuffer())
  const files = unzipSync(templateBuf) as Record<string, Uint8Array>

  const sheetXml = new TextDecoder().decode(files['xl/worksheets/sheet1.xml'])
  const newSheetXml = rebuildSheetXml(sheetXml, linhas, cabecalho)

  const updatedFiles: Zippable = {}
  for (const [name, data] of Object.entries(files)) {
    updatedFiles[name] =
      name === 'xl/worksheets/sheet1.xml' ? new TextEncoder().encode(newSheetXml) : data
  }

  const zipped = zipSync(updatedFiles, { level: 6 })
  return new Blob([zipped], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export async function downloadImhXlsx(
  linhas: ImhXlsxLinha[],
  cabecalho: ImhCabecalho,
  fileName?: string,
): Promise<void> {
  const blob = await generateImhXlsxBlob(linhas, cabecalho)
  const nome = fileName ?? getImhXlsxFileName(cabecalho)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = nome
  anchor.click()
  URL.revokeObjectURL(url)
}

export { getImhXlsxFileName }
