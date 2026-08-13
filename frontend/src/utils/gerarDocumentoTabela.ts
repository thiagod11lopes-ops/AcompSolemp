import { zipSync, type Zippable } from 'fflate'

export type GerarDocumentoFormato = 'pdf' | 'xlsx'

export interface GerarDocumentoTabela {
  titulo: string
  fileBaseName: string
  headers: string[]
  rows: string[][]
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function colLetters(index: number): string {
  let n = index
  let s = ''
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function stampFileBase(base: string): string {
  const safe = base.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'documento'
  const stamp = new Date().toISOString().slice(0, 10)
  return `${safe}-${stamp}`
}

/** Gera .xlsx mínimo (Office Open XML) a partir de uma tabela. */
export async function downloadTabelaAsXlsx(table: GerarDocumentoTabela): Promise<void> {
  const headers = table.headers
  const rows = table.rows
  const shared: string[] = []
  const indexOf = (value: string) => {
    const i = shared.indexOf(value)
    if (i >= 0) return i
    shared.push(value)
    return shared.length - 1
  }

  const headerCells = headers
    .map((h, c) => {
      const ref = `${colLetters(c)}1`
      return `<c r="${ref}" t="s"><v>${indexOf(h)}</v></c>`
    })
    .join('')

  const dataRowsXml = rows
    .map((row, r) => {
      const rowNum = r + 2
      const cells = headers
        .map((_, c) => {
          const ref = `${colLetters(c)}${rowNum}`
          const text = String(row[c] ?? '')
          return `<c r="${ref}" t="s"><v>${indexOf(text)}</v></c>`
        })
        .join('')
      return `<row r="${rowNum}">${cells}</row>`
    })
    .join('')

  const sharedXml = shared
    .map((s) => `<si><t>${escapeXml(s)}</t></si>`)
    .join('')

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">${headerCells}</row>
    ${dataRowsXml}
  </sheetData>
</worksheet>`

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">
${sharedXml}
</sst>`

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Planilha" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="1"><xf/></cellXfs>
</styleSheet>`

  const enc = new TextEncoder()
  const files: Zippable = {
    '[Content_Types].xml': enc.encode(contentTypes),
    '_rels/.rels': enc.encode(rootRels),
    'xl/workbook.xml': enc.encode(workbookXml),
    'xl/_rels/workbook.xml.rels': enc.encode(workbookRels),
    'xl/worksheets/sheet1.xml': enc.encode(sheetXml),
    'xl/sharedStrings.xml': enc.encode(sharedStringsXml),
    'xl/styles.xml': enc.encode(stylesXml),
  }

  const zipped = zipSync(files, { level: 6 })
  triggerDownload(
    new Blob([zipped], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${stampFileBase(table.fileBaseName)}.xlsx`,
  )
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function toWinAnsiSafe(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?')
}

/** Gera PDF simples (texto) a partir de uma tabela. */
export async function downloadTabelaAsPdf(table: GerarDocumentoTabela): Promise<void> {
  const title = toWinAnsiSafe(table.titulo)
  const headers = table.headers.map(toWinAnsiSafe)
  const rows = table.rows.map((row) => row.map((cell) => toWinAnsiSafe(String(cell ?? ''))))

  const lines: string[] = [title, '']
  lines.push(headers.join(' | '))
  lines.push('-'.repeat(Math.min(120, headers.join(' | ').length)))
  for (const row of rows) {
    lines.push(row.join(' | '))
  }
  if (rows.length === 0) lines.push('(sem registros)')

  const contentLines: string[] = ['BT', '/F1 10 Tf', '40 800 Td', '12 TL']
  lines.forEach((line, index) => {
    const safe = pdfEscape(line.slice(0, 140))
    if (index === 0) contentLines.push(`(${safe}) Tj`, 'T*')
    else contentLines.push(`(${safe}) '`)
  })
  contentLines.push('ET')
  const stream = contentLines.join('\n')

  const objects: string[] = []
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n')
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n')
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj\n',
  )
  objects.push('4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n')
  objects.push(
    `5 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`,
  )

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (const obj of objects) {
    offsets.push(pdf.length)
    pdf += obj
  }
  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  pdf += `startxref\n${xrefStart}\n%%EOF`

  triggerDownload(new Blob([pdf], { type: 'application/pdf' }), `${stampFileBase(table.fileBaseName)}.pdf`)
}

export async function downloadGerarDocumento(
  table: GerarDocumentoTabela,
  formato: GerarDocumentoFormato,
): Promise<void> {
  if (formato === 'xlsx') {
    await downloadTabelaAsXlsx(table)
    return
  }
  await downloadTabelaAsPdf(table)
}
