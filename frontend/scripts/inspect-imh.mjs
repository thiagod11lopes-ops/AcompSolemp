import { readFileSync } from 'fs'
import { unzipSync } from 'fflate'

const buf = readFileSync('c:/Users/DELL/Desktop/IMH.ods')
const files = unzipSync(new Uint8Array(buf))
const xml = new TextDecoder().decode(files['content.xml'])

const rows = [...xml.matchAll(/<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g)]

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
    const val = paragraphs.map((p) => p[1]).join(' ').trim()
    const count = repeat ? Math.min(parseInt(repeat[1], 10), 40) : 1
    for (let i = 0; i < count; i++) cells.push(val)
  }
  return cells
}

const grid = rows.map((r) => extractRowTexts(r[1]))
console.log('Total rows:', grid.length)
for (let i = 0; i < Math.min(30, grid.length); i++) {
  const r = grid[i].filter((c) => c)
  if (r.length) console.log(i + 1, JSON.stringify(grid[i].slice(0, 25)))
}
