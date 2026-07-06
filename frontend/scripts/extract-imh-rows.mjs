import { readFileSync, writeFileSync } from 'fs'
import { unzipSync } from 'fflate'

const buf = readFileSync('public/templates/IMH.ods')
const files = unzipSync(new Uint8Array(buf))
const xml = new TextDecoder().decode(files['content.xml'])
const rows = [...xml.matchAll(/<table:table-row[^>]*>[\s\S]*?<\/table:table-row>/g)]

writeFileSync('scripts/imh-row7.xml', rows[6][0])
writeFileSync('scripts/imh-row8.xml', rows[7][0])
writeFileSync('scripts/imh-row1.xml', rows[0][0])
writeFileSync('scripts/imh-row19.xml', rows[18][0])
console.log('written', rows.length, 'rows')
