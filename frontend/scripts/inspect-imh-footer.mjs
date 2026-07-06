import { readFileSync } from 'fs'
import { unzipSync } from 'fflate'

const buf = readFileSync('c:/Users/DELL/Desktop/IMH.ods')
const files = unzipSync(new Uint8Array(buf))
const xml = new TextDecoder().decode(files['content.xml'])

function extractRowTexts(rowXml) {
  const cells = []
  const cellRe =
    /<table:table-cell([^>]*)>([\s\S]*?)<\/table:table-cell>|<table:covered-table-cell([^>]*)>|<table:table-cell([^>]*)\/>/g
  let match
  while ((match = cellRe.exec(rowXml))) {
    if (match[0].startsWith('<table:covered')) {
      cells.push('__COVERED__')
      continue
    }
    const attrs = match[1] || match[4] || ''
    const repeat = attrs.match(/number-columns-repeated="(\d+)"/)
    const body = match[2] || ''
    const paragraphs = [...body.matchAll(/<text:p[^>]*>([\s\S]*?)<\/text:p>/g)]
    const val = paragraphs.map((p) => p[1].replace(/<[^>]+>/g, '').trim()).join(' ').trim()
    const count = repeat ? Math.min(parseInt(repeat[1], 10), 3) : 1
    for (let i = 0; i < count; i++) cells.push(val)
  }
  return cells
}

const rowMatches = [...xml.matchAll(/<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g)]
const fullRows = rowMatches.map((m) => m[0])
const innerRows = rowMatches.map((m) => m[1])

console.log('Finding footer...')
for (let i = 6; i < Math.min(35, fullRows.length); i++) {
  const texts = extractRowTexts(innerRows[i])
  const joined = texts.filter((t) => t && t !== '__COVERED__').join(' | ')
  if (joined) console.log(i + 1, joined.slice(0, 120))
}

// Find table:table body boundaries
const tableStart = xml.indexOf('<table:table ')
const tableEnd = xml.indexOf('</table:table>')
console.log('\nTable bounds:', tableStart, tableEnd)
