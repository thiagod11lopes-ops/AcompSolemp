import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { unzipSync } from 'fflate'

const buf = readFileSync('c:/Users/DELL/Desktop/IMH.ods')
const files = unzipSync(new Uint8Array(buf))
console.log('Files:', Object.keys(files).sort())

const xml = new TextDecoder().decode(files['content.xml'])
const rows = [...xml.matchAll(/<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g)]
console.log('Row count:', rows.length)

// dump first 20 raw row xml snippets (truncated)
for (let i = 0; i < Math.min(12, rows.length); i++) {
  console.log('\n--- ROW', i + 1, '---')
  console.log(rows[i][0].slice(0, 800))
}

// find data row start index (header row with NIP)
rows.forEach((r, i) => {
  if (r[0].includes('NIP') && r[0].includes('INICIAIS')) console.log('Header row index:', i + 1)
})
