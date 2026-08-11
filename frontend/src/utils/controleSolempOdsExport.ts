import { zipSync, type Zippable } from 'fflate'
import {
  CONTROLE_SOLEMP_COLUNAS,
  type ControleSolempPlanilha,
} from '@/utils/controleSolempTemplate'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function strCell(text: string, style = 'ceCell'): string {
  return `<table:table-cell office:value-type="string" calcext:value-type="string" table:style-name="${style}"><text:p>${escapeXml(text)}</text:p></table:table-cell>`
}

function buildContentXml(planilha: ControleSolempPlanilha): string {
  const headerCells = CONTROLE_SOLEMP_COLUNAS.map((col) => strCell(col.label, 'ceHeader')).join('')
  const headerRow = `<table:table-row table:style-name="roHeader">${headerCells}</table:table-row>`

  const dataRows = planilha.linhas
    .map((linha) => {
      const cells = CONTROLE_SOLEMP_COLUNAS.map((col) => strCell(String(linha[col.key] ?? ''))).join(
        '',
      )
      return `<table:table-row table:style-name="roData">${cells}</table:table-row>`
    })
    .join('')

  const colStyles = CONTROLE_SOLEMP_COLUNAS.map(
    (_col, index) =>
      `<table:table-column table:style-name="co${index + 1}" table:default-cell-style-name="ceCell"/>`,
  ).join('')

  const styleCols = CONTROLE_SOLEMP_COLUNAS.map((col, index) => {
    const cm = Math.max(1.5, col.width / 40)
    return `<style:style style:name="co${index + 1}" style:family="table-column"><style:table-column-properties style:column-width="${cm.toFixed(2)}cm"/></style:style>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0"
  office:version="1.3">
  <office:automatic-styles>
    <style:style style:name="ta1" style:family="table">
      <style:table-properties table:display="true"/>
    </style:style>
    ${styleCols}
    <style:style style:name="roHeader" style:family="table-row">
      <style:table-row-properties style:row-height="0.55cm"/>
    </style:style>
    <style:style style:name="roData" style:family="table-row">
      <style:table-row-properties style:row-height="0.45cm"/>
    </style:style>
    <style:style style:name="ceHeader" style:family="table-cell">
      <style:table-cell-properties fo:background-color="#f2f2f2" fo:border="0.5pt solid #d4d4d4"/>
      <style:text-properties fo:font-family="Calibri" fo:font-size="10pt" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="ceCell" style:family="table-cell">
      <style:table-cell-properties fo:border="0.5pt solid #d4d4d4"/>
      <style:text-properties fo:font-family="Calibri" fo:font-size="11pt"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:spreadsheet>
      <table:table table:name="Controle SOLEMP" table:style-name="ta1">
        ${colStyles}
        ${headerRow}
        ${dataRows}
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document-content>`
}

function buildManifestXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="application/vnd.oasis.opendocument.spreadsheet"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`
}

function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  office:version="1.3">
  <office:styles/>
</office:document-styles>`
}

function buildMetaXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  office:version="1.3">
  <office:meta>
    <dc:title>Controle SOLEMP</dc:title>
    <meta:generator>AcompSolemp</meta:generator>
  </office:meta>
</office:document-meta>`
}

export function getControleSolempOdsFileName(): string {
  const stamp = new Date().toISOString().slice(0, 10)
  return `Controle-SOLEMP-${stamp}.ods`
}

export async function generateControleSolempOdsBlob(
  planilha: ControleSolempPlanilha,
): Promise<Blob> {
  const encoder = new TextEncoder()
  const content = encoder.encode(buildContentXml(planilha))
  const styles = encoder.encode(buildStylesXml())
  const meta = encoder.encode(buildMetaXml())
  const manifest = encoder.encode(buildManifestXml())
  const mime = encoder.encode('application/vnd.oasis.opendocument.spreadsheet')

  const files: Zippable = {
    mimetype: [mime, { level: 0 }],
    'META-INF/manifest.xml': manifest,
    'content.xml': content,
    'styles.xml': styles,
    'meta.xml': meta,
  }

  const zipped = zipSync(files, { level: 6 })
  return new Blob([zipped], {
    type: 'application/vnd.oasis.opendocument.spreadsheet',
  })
}

export async function downloadControleSolempOds(
  planilha: ControleSolempPlanilha,
  fileName?: string,
): Promise<void> {
  const blob = await generateControleSolempOdsBlob(planilha)
  const nome = fileName ?? getControleSolempOdsFileName()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = nome
  anchor.click()
  URL.revokeObjectURL(url)
}
