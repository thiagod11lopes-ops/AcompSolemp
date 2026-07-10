import { unzipSync, zipSync, type Zippable } from 'fflate'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'

const PME_TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/Modelo-IHM-PME.ods`

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function strCell(text: string): string {
  return `<table:table-cell office:value-type="string"><text:p>${escapeXml(text)}</text:p></table:table-cell>`
}

function buildDataRow(row: ConsumoMaterialRow): string {
  const qtd = row.qtd?.trim() || (row.valorNumerico > 0 ? '1' : '')
  const unit =
    row.valorUnitario?.trim() ||
    (row.valorNumerico > 0 ? formatValorBrasileiro(row.valorNumerico) : '')
  const total =
    row.valor?.trim() ||
    (row.valorNumerico > 0 ? formatValorBrasileiro(row.valorNumerico) : '')
  const item = row.itemPme?.trim() || row.materiais?.trim() || row.procedimento?.trim() || ''

  return (
    '<table:table-row>' +
    strCell(row.data) +
    strCell(row.nip) +
    strCell(row.nome) +
    strCell(item) +
    strCell(qtd) +
    strCell(unit) +
    strCell(total) +
    strCell(row.nipTitular || row.nip) +
    strCell(row.postoGrad) +
    strCell(row.vinculo) +
    strCell(row.pctIndenizar) +
    strCell(row.om) +
    strCell(row.unidadeFornecimento) +
    strCell(row.quantidadeAdquirida) +
    strCell(row.maneiraDispensacao) +
    '</table:table-row>'
  )
}

function replaceTableRows(contentXml: string, dataRowsXml: string): string {
  const tableMatch = contentXml.match(
    /<table:table table:name="Planilha"[^>]*>([\s\S]*?)<\/table:table>/,
  )
  if (!tableMatch) {
    throw new Error('Aba Planilha não encontrada no modelo PME.')
  }

  const tableBody = tableMatch[1]
  const headerRowMatch = tableBody.match(/<table:table-row[\s\S]*?<\/table:table-row>/)
  if (!headerRowMatch) {
    throw new Error('Cabeçalho do modelo PME não encontrado.')
  }

  const headerRow = headerRowMatch[0]
  const rebuiltTable =
    `<table:table table:name="Planilha" table:style-name="ta1">` +
    headerRow +
    dataRowsXml +
    `</table:table>`

  return contentXml.replace(tableMatch[0], rebuiltTable)
}

export async function downloadMedicamentoPmeOds(
  rows: ConsumoMaterialRow[],
  fileName = 'Modelo-IHM-PME.ods',
): Promise<void> {
  const response = await fetch(PME_TEMPLATE_URL)
  if (!response.ok) throw new Error('Modelo IHM PME não encontrado.')
  const buffer = new Uint8Array(await response.arrayBuffer())
  const files = unzipSync(buffer)
  const contentBytes = files['content.xml']
  if (!contentBytes) throw new Error('Modelo IHM PME inválido.')

  const decoder = new TextDecoder('utf-8')
  const encoder = new TextEncoder()
  let contentXml = decoder.decode(contentBytes)
  const dataRowsXml = rows.map(buildDataRow).join('')
  contentXml = replaceTableRows(contentXml, dataRowsXml)

  const nextFiles: Zippable = { ...files, 'content.xml': encoder.encode(contentXml) }
  const zipped = zipSync(nextFiles)
  const blob = new Blob([zipped.buffer as ArrayBuffer], {
    type: 'application/vnd.oasis.opendocument.spreadsheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function getMedicamentoPmeFileName(mesLabel?: string): string {
  const ref = mesLabel?.replace(/\//g, '-') || 'planilha'
  return `Modelo-IHM-PME-${ref}.ods`
}
