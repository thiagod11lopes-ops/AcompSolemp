import { unzipSync } from 'fflate'
import {
  type PlanilhaCellData,
  type PlanilhaCellStyle,
  type PlanilhaHAlign,
  type PlanilhaMergeRange,
  type PlanilhaSheetData,
  type PlanilhaVAlign,
  PLANILHA_BRANCA_CELL_WIDTH,
  PLANILHA_BRANCA_ROW_HEIGHT,
  emptyCell,
  normalizeSheetData,
} from '@/utils/planilhaBrancaGrid'

export interface SpreadsheetRichSheetImport {
  nome: string
  sheet: PlanilhaSheetData
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&#10;/g, '\n')
    .replace(/&#xA;/gi, '\n')
}

function colLettersToIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, '').toUpperCase()
  let n = 0
  for (let i = 0; i < letters.length; i += 1) {
    n = n * 26 + (letters.charCodeAt(i) - 64)
  }
  return Math.max(0, n - 1)
}

function parseCellRef(ref: string): { row: number; col: number } {
  const match = ref.match(/^([A-Za-z]+)(\d+)$/)
  if (!match) return { row: 0, col: 0 }
  return {
    col: colLettersToIndex(match[1]),
    row: Math.max(0, parseInt(match[2], 10) - 1),
  }
}

function parseMergeRef(ref: string): PlanilhaMergeRange | null {
  const [a, b] = ref.split(':')
  if (!a) return null
  const start = parseCellRef(a)
  const end = b ? parseCellRef(b) : start
  return {
    startRow: Math.min(start.row, end.row),
    startCol: Math.min(start.col, end.col),
    endRow: Math.max(start.row, end.row),
    endCol: Math.max(start.col, end.col),
  }
}

function rgbFromExcel(hex: string | undefined): string | undefined {
  if (!hex) return undefined
  const cleaned = hex.replace(/^FF/i, '').replace(/[^0-9A-Fa-f]/g, '')
  if (cleaned.length === 6) return `#${cleaned}`
  if (cleaned.length === 8) return `#${cleaned.slice(2)}`
  return undefined
}

function ensureMatrix(
  cells: PlanilhaCellData[][],
  row: number,
  col: number,
): void {
  while (cells.length <= row) cells.push([])
  while (cells[row].length <= col) cells[row].push(emptyCell())
}

/* ===================== XLSX ===================== */

interface XlsxFont {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  size?: number
  name?: string
  color?: string
}

interface XlsxFill {
  fg?: string
}

interface XlsxBorderSide {
  color?: string
}

interface XlsxBorder {
  top?: XlsxBorderSide
  right?: XlsxBorderSide
  bottom?: XlsxBorderSide
  left?: XlsxBorderSide
}

interface XlsxXf {
  fontId: number
  fillId: number
  borderId: number
  applyFont?: boolean
  applyFill?: boolean
  applyBorder?: boolean
  applyAlignment?: boolean
  horizontal?: PlanilhaHAlign
  vertical?: PlanilhaVAlign
  wrapText?: boolean
}

function parseXlsxStyles(stylesXml: string): {
  fonts: XlsxFont[]
  fills: XlsxFill[]
  borders: XlsxBorder[]
  xfs: XlsxXf[]
} {
  const fonts: XlsxFont[] = []
  for (const match of stylesXml.matchAll(/<font>([\s\S]*?)<\/font>|<font\/>/g)) {
    const body = match[1] ?? ''
    fonts.push({
      bold: /<b\b/.test(body) || /<b\/>/.test(body),
      italic: /<i\b/.test(body) || /<i\/>/.test(body),
      underline: /<u\b/.test(body) || /<u\/>/.test(body),
      size: parseFloat(body.match(/<sz[^>]*val="([^"]+)"/)?.[1] ?? '') || undefined,
      name: body.match(/<name[^>]*val="([^"]+)"/)?.[1],
      color:
        rgbFromExcel(body.match(/<color[^>]*rgb="([^"]+)"/)?.[1]) ||
        undefined,
    })
  }

  const fills: XlsxFill[] = []
  for (const match of stylesXml.matchAll(/<fill>([\s\S]*?)<\/fill>/g)) {
    const body = match[1] ?? ''
    fills.push({
      fg:
        rgbFromExcel(body.match(/fgColor[^>]*rgb="([^"]+)"/)?.[1]) ||
        undefined,
    })
  }

  const borders: XlsxBorder[] = []
  for (const match of stylesXml.matchAll(/<border>([\s\S]*?)<\/border>|<border\/>/g)) {
    const body = match[1] ?? ''
    const side = (tag: string): XlsxBorderSide | undefined => {
      const sideXml = body.match(new RegExp(`<${tag}([^>]*)(?:/>|>([\\s\\S]*?)</${tag}>)`))
      if (!sideXml) return undefined
      const attrs = sideXml[1] ?? ''
      const inner = sideXml[2] ?? ''
      if (!/style=/.test(attrs) && !inner) return undefined
      return {
        color:
          rgbFromExcel(inner.match(/rgb="([^"]+)"/)?.[1]) ||
          rgbFromExcel(attrs.match(/rgb="([^"]+)"/)?.[1]) ||
          '#000000',
      }
    }
    borders.push({
      top: side('top'),
      left: side('left'),
      right: side('right'),
      bottom: side('bottom'),
    })
  }

  const xfs: XlsxXf[] = []
  const xfBlock =
    stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ??
    stylesXml.match(/<cellXfs[^>]*\/>/)?.[0] ??
    ''
  for (const match of xfBlock.matchAll(/<xf\b([^>]*)(?:\/>|>([\s\S]*?)<\/xf>)/g)) {
    const attrs = match[1] ?? ''
    const body = match[2] ?? ''
    const align = body.match(/<alignment\b([^>]*)\/>|<alignment\b([^>]*)>/)
    const alignAttrs = align?.[1] || align?.[2] || ''
    const h = alignAttrs.match(/\bhorizontal="([^"]+)"/)?.[1]
    const v = alignAttrs.match(/\bvertical="([^"]+)"/)?.[1]
    xfs.push({
      fontId: parseInt(attrs.match(/\bfontId="(\d+)"/)?.[1] ?? '0', 10),
      fillId: parseInt(attrs.match(/\bfillId="(\d+)"/)?.[1] ?? '0', 10),
      borderId: parseInt(attrs.match(/\bborderId="(\d+)"/)?.[1] ?? '0', 10),
      applyFont: /applyFont="1"/.test(attrs),
      applyFill: /applyFill="1"/.test(attrs),
      applyBorder: /applyBorder="1"/.test(attrs),
      applyAlignment: /applyAlignment="1"/.test(attrs) || Boolean(align),
      horizontal:
        h === 'center' || h === 'right' || h === 'left' ? (h as PlanilhaHAlign) : undefined,
      vertical:
        v === 'top' || v === 'center' || v === 'bottom'
          ? ((v === 'center' ? 'middle' : v) as PlanilhaVAlign)
          : undefined,
      wrapText: /wrapText="1"/.test(alignAttrs),
    })
  }

  return { fonts, fills, borders, xfs }
}

function styleFromXlsxXf(
  styleIndex: number | undefined,
  styles: ReturnType<typeof parseXlsxStyles>,
): PlanilhaCellStyle | undefined {
  if (styleIndex === undefined || !styles.xfs[styleIndex]) return undefined
  const xf = styles.xfs[styleIndex]
  const font = styles.fonts[xf.fontId] ?? {}
  const fill = styles.fills[xf.fillId] ?? {}
  const border = styles.borders[xf.borderId] ?? {}
  const style: PlanilhaCellStyle = {}
  if (font.bold) style.bold = true
  if (font.italic) style.italic = true
  if (font.underline) style.underline = true
  if (font.size) style.fontSize = font.size
  if (font.name) style.fontFamily = font.name
  if (font.color) style.color = font.color
  if (fill.fg) style.backgroundColor = fill.fg
  if (xf.horizontal) style.horizontalAlign = xf.horizontal
  if (xf.vertical) style.verticalAlign = xf.vertical
  if (xf.wrapText) style.wrapText = true
  if (border.top?.color) style.borderTop = border.top.color
  if (border.right?.color) style.borderRight = border.right.color
  if (border.bottom?.color) style.borderBottom = border.bottom.color
  if (border.left?.color) style.borderLeft = border.left.color
  return Object.keys(style).length ? style : undefined
}

function readXlsxSharedStrings(xml: string): string[] {
  const result: string[] = []
  for (const si of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const body = si[1]
    const richParts = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) =>
      decodeXmlText(m[1]),
    )
    if (richParts.length) {
      result.push(richParts.join(''))
      continue
    }
    result.push('')
  }
  return result
}

function readXlsxCellValue(cellXml: string, sharedStrings: string[]): string {
  const type = cellXml.match(/\bt="([^"]+)"/)?.[1]
  const value = cellXml.match(/<v>([^<]*)<\/v>/)?.[1]
  const inlineParts = [...cellXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) =>
    decodeXmlText(m[1]),
  )
  if (inlineParts.length) return inlineParts.join('')
  if (type === 'inlineStr') return inlineParts.join('')
  if (type === 's' && value != null) return sharedStrings[parseInt(value, 10)] ?? ''
  return value != null ? decodeXmlText(value) : ''
}

async function readXlsxRichSheets(file: File): Promise<SpreadsheetRichSheetImport[]> {
  const buffer = await file.arrayBuffer()
  const unzipped = unzipSync(new Uint8Array(buffer))
  const workbookXmlBytes = unzipped['xl/workbook.xml']
  if (!workbookXmlBytes) throw new Error('Arquivo XLSX inválido ou corrompido')
  const workbookXml = new TextDecoder('utf-8').decode(workbookXmlBytes)
  const sheetEntries = [...workbookXml.matchAll(/<sheet\b([^>]*)\/>|<sheet\b([^>]*)><\/sheet>/g)]
  if (!sheetEntries.length) throw new Error('Nenhuma aba encontrada no arquivo XLSX')

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

  const stylesXml = unzipped['xl/styles.xml']
    ? new TextDecoder('utf-8').decode(unzipped['xl/styles.xml'])
    : ''
  const styles = stylesXml
    ? parseXlsxStyles(stylesXml)
    : { fonts: [], fills: [], borders: [], xfs: [] }

  const sharedXml = unzipped['xl/sharedStrings.xml']
  const sharedStrings = sharedXml
    ? readXlsxSharedStrings(new TextDecoder('utf-8').decode(sharedXml))
    : []

  const sheets: SpreadsheetRichSheetImport[] = []

  sheetEntries.forEach((entry, index) => {
    const attrs = entry[1] || entry[2] || ''
    const nome = decodeXmlText(attrs.match(/\bname="([^"]+)"/)?.[1]?.trim() || `Planilha ${index + 1}`)
    const rId = attrs.match(/\br:id="([^"]+)"/)?.[1]
    let sheetPath = (rId ? relMap.get(rId) : undefined) ?? `xl/worksheets/sheet${index + 1}.xml`
    if (!unzipped[sheetPath]) {
      const fallback = Object.keys(unzipped).find((key) =>
        key.replace(/\\/g, '/').endsWith(`/sheet${index + 1}.xml`),
      )
      if (fallback) sheetPath = fallback
    }
    const bytes = unzipped[sheetPath]
    if (!bytes) return
    const sheetXml = new TextDecoder('utf-8').decode(bytes)

    const cells: PlanilhaCellData[][] = []
    const merges: PlanilhaMergeRange[] = []
    const colWidths: number[] = []
    const rowHeights: number[] = []

    for (const col of sheetXml.matchAll(/<col\b([^>]*)\/>/g)) {
      const a = col[1] ?? ''
      const min = parseInt(a.match(/\bmin="(\d+)"/)?.[1] ?? '1', 10) - 1
      const max = parseInt(a.match(/\bmax="(\d+)"/)?.[1] ?? String(min + 1), 10) - 1
      const width = parseFloat(a.match(/\bwidth="([^"]+)"/)?.[1] ?? '')
      const px = Number.isFinite(width) ? Math.round(width * 7.5) : PLANILHA_BRANCA_CELL_WIDTH
      for (let c = min; c <= max; c += 1) colWidths[c] = Math.max(24, px)
    }

    for (const rowMatch of sheetXml.matchAll(/<row\b([^>]*)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const rowAttrs = rowMatch[1] ?? ''
      const rowBody = rowMatch[2] ?? ''
      const rowIndex = parseInt(rowAttrs.match(/\br="(\d+)"/)?.[1] ?? '0', 10) - 1
      if (rowIndex < 0) continue
      const ht = parseFloat(rowAttrs.match(/\bht="([^"]+)"/)?.[1] ?? '')
      if (Number.isFinite(ht)) rowHeights[rowIndex] = Math.max(14, Math.round(ht * 1.33))

      for (const cellMatch of rowBody.matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const cellAttrs = cellMatch[1] ?? ''
        const cellBody = cellMatch[0]
        const ref = cellAttrs.match(/\br="([A-Za-z]+\d+)"/)?.[1]
        if (!ref) continue
        const { row, col } = parseCellRef(ref)
        const styleIndex = cellAttrs.match(/\bs="(\d+)"/)?.[1]
        const value = readXlsxCellValue(cellBody, sharedStrings)
        ensureMatrix(cells, row, col)
        cells[row][col] = {
          value,
          style: styleFromXlsxXf(
            styleIndex != null ? parseInt(styleIndex, 10) : undefined,
            styles,
          ),
        }
      }
    }

    for (const merge of sheetXml.matchAll(/<mergeCell[^>]*ref="([^"]+)"/g)) {
      const range = parseMergeRef(merge[1])
      if (range) merges.push(range)
    }

    if (!cells.length) return
    sheets.push({
      nome,
      sheet: normalizeSheetData({
        cells,
        merges,
        colWidths,
        rowHeights,
      }),
    })
  })

  if (!sheets.length) throw new Error('Nenhuma aba com dados encontrada no arquivo XLSX')
  return sheets
}

/* ===================== ODS ===================== */

function parseOdsStyleMap(xml: string): Map<string, PlanilhaCellStyle> {
  const map = new Map<string, PlanilhaCellStyle>()
  const styleChunks = [
    ...xml.matchAll(/<style:style\b([^>]*)>([\s\S]*?)<\/style:style>/g),
  ]
  for (const match of styleChunks) {
    const attrs = match[1] ?? ''
    const body = match[2] ?? ''
    const name = attrs.match(/\bstyle:name="([^"]+)"/)?.[1]
    if (!name) continue
    const style: PlanilhaCellStyle = {}
    const textProps = body.match(/<style:text-properties\b([^>]*)\/?>/)?.[1] ?? ''
    const paraProps = body.match(/<style:paragraph-properties\b([^>]*)\/?>/)?.[1] ?? ''
    const cellProps = body.match(/<style:table-cell-properties\b([^>]*)\/?>/)?.[1] ?? ''

    if (/fo:font-weight="bold"/.test(textProps) || /fo:font-weight="700"/.test(textProps)) {
      style.bold = true
    }
    if (/fo:font-style="italic"/.test(textProps)) style.italic = true
    if (/style:text-underline-style="solid"/.test(textProps)) style.underline = true
    const fontSize = textProps.match(/fo:font-size="([\d.]+)pt"/)?.[1]
    if (fontSize) style.fontSize = parseFloat(fontSize)
    const fontFamily =
      textProps.match(/style:font-name="([^"]+)"/)?.[1] ||
      textProps.match(/fo:font-family="([^"]+)"/)?.[1]
    if (fontFamily) style.fontFamily = fontFamily.replace(/'/g, '')
    const color = textProps.match(/fo:color="([^"]+)"/)?.[1]
    if (color) style.color = color
    const bg = cellProps.match(/fo:background-color="([^"]+)"/)?.[1]
    if (bg && bg !== 'transparent') style.backgroundColor = bg

    const align = paraProps.match(/fo:text-align="([^"]+)"/)?.[1]
    if (align === 'center' || align === 'end' || align === 'right') {
      style.horizontalAlign = align === 'end' ? 'right' : (align as PlanilhaHAlign)
    } else if (align === 'start' || align === 'left') {
      style.horizontalAlign = 'left'
    }
    const valign = cellProps.match(/style:vertical-align="([^"]+)"/)?.[1]
    if (valign === 'top' || valign === 'middle' || valign === 'bottom') {
      style.verticalAlign = valign
    }
    if (/fo:wrap-option="wrap"/.test(cellProps)) style.wrapText = true

    const border = cellProps.match(/fo:border="([^"]+)"/)?.[1]
    if (border && border !== 'none') {
      const colorMatch = border.match(/(#[0-9A-Fa-f]{6}|[a-zA-Z]+)\s*$/)
      const borderColor = colorMatch?.[1] || '#000000'
      style.borderTop = borderColor
      style.borderRight = borderColor
      style.borderBottom = borderColor
      style.borderLeft = borderColor
    }
    ;(['top', 'right', 'bottom', 'left'] as const).forEach((side) => {
      const b = cellProps.match(new RegExp(`fo:border-${side}="([^"]+)"`))?.[1]
      if (b && b !== 'none') {
        const colorMatch = b.match(/(#[0-9A-Fa-f]{6}|[a-zA-Z]+)\s*$/)
        const borderColor = colorMatch?.[1] || '#000000'
        if (side === 'top') style.borderTop = borderColor
        if (side === 'right') style.borderRight = borderColor
        if (side === 'bottom') style.borderBottom = borderColor
        if (side === 'left') style.borderLeft = borderColor
      }
    })

    if (Object.keys(style).length) map.set(name, style)
  }
  return map
}

function extractOdsCellText(cellXml: string): string {
  const paras = [...cellXml.matchAll(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/g)].map((p) => {
    const inner = p[1]
      .replace(/<text:line-break\s*\/>/g, '\n')
      .replace(/<text:tab\s*\/>/g, '\t')
      .replace(/<text:s\b[^>]*\/>/g, ' ')
      .replace(/<[^>]+>/g, '')
    return decodeXmlText(inner)
  })
  return paras.join('\n')
}

async function readOdsRichSheets(file: File): Promise<SpreadsheetRichSheetImport[]> {
  const buffer = await file.arrayBuffer()
  const unzipped = unzipSync(new Uint8Array(buffer))
  const contentXml = unzipped['content.xml']
  if (!contentXml) throw new Error('Arquivo ODS inválido ou corrompido')
  const xml = new TextDecoder('utf-8').decode(contentXml)
  const styleMap = parseOdsStyleMap(xml)

  const sheets: SpreadsheetRichSheetImport[] = []
  const tables = [...xml.matchAll(/<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/g)]

  tables.forEach((tableMatch, tableIndex) => {
    const tableAttrs = tableMatch[1] ?? ''
    const tableBody = tableMatch[2] ?? ''
    const nome = decodeXmlText(
      tableAttrs.match(/table:name="([^"]+)"/)?.[1]?.trim() || `Planilha ${tableIndex + 1}`,
    )

    const cells: PlanilhaCellData[][] = []
    const merges: PlanilhaMergeRange[] = []
    const colWidths: number[] = []
    const rowHeights: number[] = []
    let rowIndex = 0

    for (const col of tableBody.matchAll(/<table:table-column\b([^>]*)\/?>/g)) {
      const a = col[1] ?? ''
      const repeat = parseInt(a.match(/table:number-columns-repeated="(\d+)"/)?.[1] ?? '1', 10)
      const styleName = a.match(/table:style-name="([^"]+)"/)?.[1]
      // ODS column width often in style — fallback default
      const width = PLANILHA_BRANCA_CELL_WIDTH
      void styleName
      for (let i = 0; i < Math.min(repeat, 60); i += 1) colWidths.push(width)
    }

    for (const rowMatch of tableBody.matchAll(/<table:table-row\b([^>]*)>([\s\S]*?)<\/table:table-row>/g)) {
      const rowAttrs = rowMatch[1] ?? ''
      const rowBody = rowMatch[2] ?? ''
      const rowRepeat = parseInt(
        rowAttrs.match(/table:number-rows-repeated="(\d+)"/)?.[1] ?? '1',
        10,
      )
      const rowStyle = rowAttrs.match(/table:style-name="([^"]+)"/)?.[1]
      void rowStyle
      const height = PLANILHA_BRANCA_ROW_HEIGHT

      for (let rr = 0; rr < Math.min(rowRepeat, 200); rr += 1) {
        rowHeights[rowIndex] = height
        let colIndex = 0
        const cellRe =
          /<(table:table-cell|table:covered-table-cell)\b([^>]*?)(\s*\/>|>([\s\S]*?)<\/\1>)/g
        let cellMatch: RegExpExecArray | null
        while ((cellMatch = cellRe.exec(rowBody))) {
          const isCovered = cellMatch[1] === 'table:covered-table-cell'
          const cellAttrs = cellMatch[2] ?? ''
          const colRepeat = parseInt(
            cellAttrs.match(/table:number-columns-repeated="(\d+)"/)?.[1] ?? '1',
            10,
          )
          const colSpan = parseInt(
            cellAttrs.match(/table:number-columns-spanned="(\d+)"/)?.[1] ?? '1',
            10,
          )
          const rowSpan = parseInt(
            cellAttrs.match(/table:number-rows-spanned="(\d+)"/)?.[1] ?? '1',
            10,
          )
          const styleName = cellAttrs.match(/table:style-name="([^"]+)"/)?.[1]
          const value = isCovered ? '' : extractOdsCellText(cellMatch[0])
          const style = styleName ? styleMap.get(styleName) : undefined

          for (let cr = 0; cr < Math.min(colRepeat, 60); cr += 1) {
            if (!isCovered) {
              ensureMatrix(cells, rowIndex, colIndex)
              cells[rowIndex][colIndex] = {
                value,
                style: style ? { ...style } : undefined,
              }
              if (colSpan > 1 || rowSpan > 1) {
                merges.push({
                  startRow: rowIndex,
                  startCol: colIndex,
                  endRow: rowIndex + rowSpan - 1,
                  endCol: colIndex + colSpan - 1,
                })
              }
            }
            colIndex += 1
          }
        }
        rowIndex += 1
      }
    }

    if (!cells.length) return
    sheets.push({
      nome,
      sheet: normalizeSheetData({ cells, merges, colWidths, rowHeights }),
    })
  })

  if (!sheets.length) throw new Error('Nenhuma aba encontrada no arquivo ODS')
  return sheets
}

/** Importa todas as abas com estilos, mesclas e formatação */
export async function parseSpreadsheetRichSheetsFile(
  file: File,
): Promise<SpreadsheetRichSheetImport[]> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xlsx')) return readXlsxRichSheets(file)
  if (lower.endsWith('.ods')) return readOdsRichSheets(file)
  throw new Error('Selecione um arquivo no formato .ods ou .xlsx')
}
