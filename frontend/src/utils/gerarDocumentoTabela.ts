import { zipSync, type Zippable } from 'fflate'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'

export type GerarDocumentoFormato = 'pdf' | 'xlsx'

export interface GerarDocumentoTabela {
  titulo: string
  fileBaseName: string
  headers: string[]
  rows: string[][]
  /** Larguras relativas das colunas (como na tela), para orientar paisagem/escala */
  columnWidths?: number[]
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeHtml(text: string): string {
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

/** Largura natural estimada da grade (px), alinhada às larguras da tela. */
export function estimatePlanilhaWidthPx(table: GerarDocumentoTabela): number {
  const widths = table.columnWidths
  if (widths && widths.length === table.headers.length) {
    return widths.reduce((sum, w) => sum + Math.max(48, w), 0) + 24
  }
  return table.headers.reduce((sum, header) => {
    const byLabel = Math.min(280, Math.max(72, header.length * 8 + 24))
    return sum + byLabel
  }, 24)
}

/**
 * A4 retrato útil ≈ 190mm (~718px @96dpi); se a planilha for mais larga, usa paisagem.
 */
export function resolvePlanilhaPdfOrientation(
  table: GerarDocumentoTabela,
): 'portrait' | 'landscape' {
  const natural = estimatePlanilhaWidthPx(table)
  const portraitUsablePx = 718
  return natural > portraitUsablePx ? 'landscape' : 'portrait'
}

function buildPlanilhaPdfHtml(
  table: GerarDocumentoTabela,
  orientation: 'portrait' | 'landscape',
): string {
  const stamp = new Date().toLocaleString('pt-BR')
  const colCount = Math.max(1, table.headers.length)
  const widths = table.columnWidths
  const totalWidth =
    widths && widths.length === colCount
      ? widths.reduce((a, b) => a + Math.max(48, b), 0)
      : colCount * 100

  const colgroup =
    widths && widths.length === colCount
      ? `<colgroup>${widths
          .map((w) => {
            const pct = ((Math.max(48, w) / totalWidth) * 100).toFixed(3)
            return `<col style="width:${pct}%" />`
          })
          .join('')}</colgroup>`
      : ''

  const headCells = table.headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join('')

  const bodyRows =
    table.rows.length === 0
      ? `<tr class="empty"><td colspan="${colCount}">Nenhum registro</td></tr>`
      : table.rows
          .map((row, index) => {
            const cells = table.headers
              .map((_, c) => {
                const raw = String(row[c] ?? '').trim()
                return `<td>${escapeHtml(raw || '—')}</td>`
              })
              .join('')
            return `<tr class="${index % 2 === 0 ? 'even' : 'odd'}">${cells}</tr>`
          })
          .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(table.titulo)}</title>
  <style>
    :root {
      --border: ${EXCEL_SHEET.borderColor};
      --header-bg: ${EXCEL_SHEET.headerBg};
      --toolbar-bg: ${EXCEL_SHEET.toolbarBg};
      --sheet-bg: ${EXCEL_SHEET.sheetBg};
      --text: ${EXCEL_SHEET.text};
      --muted: ${EXCEL_SHEET.mutedText};
      --accent: ${EXCEL_SHEET.selectedCheck};
      --font: ${EXCEL_SHEET.fontFamily};
      --sheet-font: 11px;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #e8eaed;
      color: var(--text);
      font-family: var(--font);
    }
    @page {
      size: A4 ${orientation};
      margin: 8mm;
    }
    @media print {
      html, body { background: #fff; }
      .no-print { display: none !important; }
      .page {
        margin: 0;
        box-shadow: none;
        border: none;
        width: auto;
        min-height: 0;
      }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
    @media screen {
      body { padding: 18px; }
      .page {
        max-width: ${orientation === 'landscape' ? '1120px' : '820px'};
        margin: 0 auto 18px;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
      }
      .hint {
        max-width: ${orientation === 'landscape' ? '1120px' : '820px'};
        margin: 0 auto 12px;
        padding: 10px 14px;
        border-radius: 10px;
        background: #fff;
        border: 1px solid #d0d7de;
        color: #334155;
        font-size: 13px;
      }
    }
    .page {
      background: #fff;
      border: 1px solid #cfd6dd;
      border-radius: 4px;
      overflow: hidden;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 10px 14px;
      background: linear-gradient(180deg, var(--toolbar-bg) 0%, #ebebeb 100%);
      border-bottom: 1px solid var(--border);
    }
    .toolbar h1 {
      margin: 0;
      font-size: 13px;
      font-weight: 800;
      color: var(--accent);
      letter-spacing: -0.01em;
    }
    .meta {
      font-size: 11px;
      color: var(--muted);
      font-weight: 600;
    }
    .chip {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid #c9d2da;
      background: #fff;
      font-size: 10px;
      font-weight: 700;
      color: #334155;
    }
    .sheet-wrap {
      padding: 10px 12px 14px;
      background: var(--sheet-bg);
      overflow: hidden;
    }
    .sheet-frame {
      border: 1px solid var(--border);
      border-radius: 2px;
      overflow: hidden;
      background: #fff;
      width: 100%;
    }
    table.excel {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
      font-size: var(--sheet-font, 11px);
      line-height: 1.25;
      color: var(--text);
    }
    table.excel th,
    table.excel td {
      border: 1px solid var(--border);
      padding: 5px 7px;
      vertical-align: middle;
      overflow: hidden;
      word-break: break-word;
    }
    table.excel th {
      background: var(--header-bg);
      font-weight: 700;
      color: var(--muted);
      text-align: left;
    }
    table.excel td { background: #fff; }
    table.excel tr.odd td { background: #fafafa; }
    table.excel tr.empty td {
      text-align: center;
      color: var(--muted);
      font-style: italic;
      padding: 18px 8px;
    }
  </style>
</head>
<body>
  <div class="hint no-print">
    Visual da planilha pronto para PDF. Na impressão, escolha <strong>Salvar como PDF</strong>
    e a folha A4 em <strong>${orientation === 'landscape' ? 'paisagem' : 'retrato'}</strong>
    (ajustada automaticamente). A escala da grade será calibrada para caber na folha.
  </div>
  <div class="page" id="page">
    <div class="toolbar">
      <div>
        <h1>${escapeHtml(table.titulo)}</h1>
        <div class="meta">
          Gerado em ${escapeHtml(stamp)}
          <span class="chip">${table.rows.length} linha(s)</span>
          <span class="chip">${orientation === 'landscape' ? 'A4 paisagem' : 'A4 retrato'}</span>
        </div>
      </div>
    </div>
    <div class="sheet-wrap">
      <div class="sheet-frame" id="sheetFrame">
        <table class="excel" id="sheetTable">
          ${colgroup}
          <thead><tr>${headCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </div>
  </div>
  <script>
    (function () {
      var orientation = ${JSON.stringify(orientation)};
      var naturalWidth = ${JSON.stringify(estimatePlanilhaWidthPx(table))};
      function fit() {
        var root = document.documentElement;
        var pageWidthMm = orientation === 'landscape' ? 297 : 210;
        var marginMm = 8 * 2;
        var usableWidthPx = ((pageWidthMm - marginMm) / 25.4) * 96;
        // Aumenta ou reduz a tipografia/grade para ocupar bem a largura útil da A4.
        var scale = usableWidthPx / Math.max(naturalWidth, 1);
        var fontPx = Math.max(6.5, Math.min(13, 11 * scale));
        root.style.setProperty('--sheet-font', fontPx + 'px');
      }
      window.addEventListener('load', function () {
        fit();
        setTimeout(function () {
          window.focus();
          window.print();
        }, 100);
      });
      window.addEventListener('beforeprint', fit);
    })();
  </script>
</body>
</html>`
}

/**
 * Abre visualização da planilha no estilo da tela e dispara impressão/PDF A4
 * (retrato ou paisagem) com escala automática para caber na folha.
 */
export async function downloadTabelaAsPdf(table: GerarDocumentoTabela): Promise<void> {
  const orientation = resolvePlanilhaPdfOrientation(table)
  const html = buildPlanilhaPdfHtml(table, orientation)
  const popup = window.open('', '_blank', 'noopener,noreferrer')
  if (!popup) {
    throw new Error(
      'Não foi possível abrir a janela do PDF. Permita pop-ups para este site e tente novamente.',
    )
  }
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
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
