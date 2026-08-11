import type {
  ConmedComrjFormData,
  ConmedComrjMaterialItem,
  ConmedComrjPaciente,
} from '@/types'
import {
  createEmptyConmedMaterialItem,
  createEmptyConmedPaciente,
  formatConmedNebPi,
  formatConmedNumero,
  formatConmedNumerico,
  formatConmedPacienteNip,
  formatConmedPregaoTad,
  formatConmedProcesso,
  formatConmedQuantidade,
  formatConmedUppercase,
  materialHasContent,
  pacienteHasContent,
  withRecalculatedPaciente,
} from '@/utils/conmedComrjForm'
import {
  formatValorBrasileiro,
  parseValorBrasileiro,
  parseSpreadsheetSheetsFile,
  type SpreadsheetSheetImport,
} from '@/utils/consumoMaterialOds'

function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function cell(rows: string[][], r: number, c: number): string {
  return String(rows[r]?.[c] ?? '').trim()
}

function findRowContaining(rows: string[][], label: string): number {
  const target = norm(label)
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
      if (norm(cell(rows, r, c)).includes(target)) return r
    }
  }
  return -1
}

function findHeaderRow(rows: string[][]): number {
  for (let r = 0; r < rows.length; r++) {
    const joined = (rows[r] ?? []).map((v) => norm(String(v ?? ''))).join('|')
    if (joined.includes('NIP') && joined.includes('PROCEDIMENTO')) return r
    if (joined.includes('NIP') && (joined.includes('MAPA') || joined.includes('DANFE'))) return r
  }
  return -1
}

function isIgnoredHeader(label: string): boolean {
  const n = norm(label)
  if (!n) return true
  if (n === 'ACOES' || n === 'ACAO' || n.includes('ACOES')) return true
  // Coluna sequencial do MODELO (N° / #), não confundir com Nº do processo
  if (n === 'N' || n === 'Nº' || n === 'N°' || n === '#' || n === 'SEQ' || n === 'ORDEM') return true
  return false
}

function isProcessLabel(label: string): boolean {
  const n = norm(label).replace(/:$/, '')
  return (
    n === 'Nº' ||
    n === 'N°' ||
    n === 'NO' ||
    n === 'NUMERO' ||
    n === 'DATA' ||
    n === 'PROCESSO' ||
    n.includes('PREGAO') ||
    n.includes('TAD') ||
    n.includes('VIGENCIA') ||
    n.includes('FORNECEDOR')
  )
}

/** Datas do MODELO: 24/06/26, 6/7/2026, serial, ou só dígitos. */
function normalizeImportDate(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const slash = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (slash) {
    const d = slash[1].padStart(2, '0')
    const m = slash[2].padStart(2, '0')
    let y = slash[3]
    if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`
    return `${d}/${m}/${y}`
  }

  const asSerial = Number.parseFloat(trimmed.replace(',', '.'))
  if (Number.isFinite(asSerial) && asSerial > 30_000 && asSerial < 60_000) {
    const excelEpoch = Date.UTC(1899, 11, 30)
    const date = new Date(excelEpoch + Math.round(asSerial) * 86_400_000)
    const day = String(date.getUTCDate()).padStart(2, '0')
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const year = String(date.getUTCFullYear())
    return `${day}/${month}/${year}`
  }

  const digits = trimmed.replace(/\D/g, '').slice(0, 8)
  if (!digits) return ''
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  if (digits.length === 6) {
    const yy = digits.slice(4)
    const yyyy = Number(yy) > 50 ? `19${yy}` : `20${yy}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${yyyy}`
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

type FieldKey =
  | 'seq'
  | 'nip'
  | 'iniciais'
  | 'data'
  | 'procedimento'
  | 'mapa'
  | 'danfe'
  | 'item'
  | 'nebPi'
  | 'descricao'
  | 'qt'
  | 'valorUnit'
  | 'valorTotal'

function scoreHeader(header: string, aliases: string[]): number {
  const h = norm(header)
  if (!h) return -1
  let best = -1
  for (const alias of aliases) {
    const a = norm(alias)
    if (!a) continue
    if (h === a) best = Math.max(best, 100)
    else if (h.startsWith(a) || a.startsWith(h)) best = Math.max(best, 85)
    else if (h.includes(a) && a.length >= 4) best = Math.max(best, 65)
  }
  return best
}

function resolveColumns(header: string[]): Partial<Record<FieldKey, number>> {
  const specs: { key: FieldKey; aliases: string[]; allowIgnored?: boolean }[] = [
    { key: 'seq', aliases: ['N°', 'Nº', '#', 'SEQ', 'ORDEM'], allowIgnored: true },
    { key: 'nip', aliases: ['NIP'] },
    { key: 'iniciais', aliases: ['INICIAIS'] },
    { key: 'data', aliases: ['DATA'] },
    { key: 'procedimento', aliases: ['PROCEDIMENTO'] },
    { key: 'mapa', aliases: ['MAPA DA SALA', 'MAPA DE SALA', 'MAPA SALA'] },
    { key: 'danfe', aliases: ['DANFE'] },
    { key: 'item', aliases: ['ITEM'] },
    { key: 'nebPi', aliases: ['NEB/PI', 'NEB PI', 'NEB'] },
    {
      key: 'descricao',
      aliases: ['DESCRICAO DO MATERIAL', 'DESCRIÇÃO DO MATERIAL', 'DESCRICAO'],
    },
    { key: 'qt', aliases: ['QT', 'QTD', 'QUANTIDADE'] },
    { key: 'valorUnit', aliases: ['V. UNIT.', 'V. UNIT', 'VALOR UNIT', 'VALOR UNITARIO'] },
    { key: 'valorTotal', aliases: ['V. TOTAL', 'VALOR TOTAL'] },
  ]

  const used = new Set<number>()
  const out: Partial<Record<FieldKey, number>> = {}

  const order: FieldKey[] = [
    'procedimento',
    'descricao',
    'mapa',
    'valorUnit',
    'valorTotal',
    'nebPi',
    'danfe',
    'iniciais',
    'nip',
    'item',
    'qt',
    'data',
    'seq',
  ]

  for (const key of order) {
    const spec = specs.find((s) => s.key === key)!
    let bestIdx = -1
    let bestScore = -1
    header.forEach((label, idx) => {
      if (used.has(idx)) return
      if (!spec.allowIgnored && isIgnoredHeader(label)) return
      const score = scoreHeader(label, spec.aliases)
      if (score > bestScore) {
        bestScore = score
        bestIdx = idx
      }
    })
    if (bestIdx >= 0 && bestScore >= 65) {
      out[key] = bestIdx
      used.add(bestIdx)
    }
  }

  // Fallback posicional MODELO: N° NIP INICIAIS DATA PROC | MAPA DANFE ITEM NEB DESC QT UNIT TOTAL
  if (out.nip == null && out.mapa == null) {
    const nipIdx = header.findIndex((h) => norm(h) === 'NIP' || norm(h).includes('NIP'))
    if (nipIdx >= 0) {
      const base = nipIdx > 0 && isIgnoredHeader(header[nipIdx - 1] ?? '') ? nipIdx - 1 : nipIdx
      const map: FieldKey[] =
        base === nipIdx - 1
          ? [
              'seq',
              'nip',
              'iniciais',
              'data',
              'procedimento',
              'mapa',
              'danfe',
              'item',
              'nebPi',
              'descricao',
              'qt',
              'valorUnit',
              'valorTotal',
            ]
          : [
              'nip',
              'iniciais',
              'data',
              'procedimento',
              'mapa',
              'danfe',
              'item',
              'nebPi',
              'descricao',
              'qt',
              'valorUnit',
              'valorTotal',
            ]
      map.forEach((key, offset) => {
        if (out[key] == null && base + offset < header.length) out[key] = base + offset
      })
    }
  }

  return out
}

function looksLikeNip(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  // Evita confundir totais (19.575,00) com NIP
  if (/,\d{2}$/.test(trimmed.replace(/\s/g, ''))) return false
  if (/^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(trimmed)) return false
  if (/\d{1,2}\.\d{4}\.\d{1,2}/.test(trimmed)) return true
  const digits = trimmed.replace(/\D/g, '')
  return digits.length === 8 && !trimmed.includes(',')
}

function looksLikeSeq(value: string): boolean {
  return /^\d{1,3}$/.test(value.trim())
}

function parseProcessoFromRows(rows: string[][]): Partial<ConmedComrjFormData> {
  const out: Partial<ConmedComrjFormData> = {}
  const start = findRowContaining(rows, 'DADOS DO PROCESSO')
  const headerIdx = findHeaderRow(rows)
  const pacienteBlock = findRowContaining(rows, 'DADOS DO PACIENTE')
  const endExclusive = Math.min(
    ...[headerIdx, pacienteBlock].filter((n) => n >= 0),
    rows.length,
    (start >= 0 ? start : 0) + 12,
  )

  const from = start >= 0 ? start : 0
  for (let r = from; r < endExclusive; r++) {
    const row = rows[r] ?? []
    for (let c = 0; c < row.length; c++) {
      const rawLabel = cell(rows, r, c)
      const label = norm(rawLabel).replace(/:$/, '')
      if (!label || (!isProcessLabel(rawLabel) && !isProcessLabel(label))) continue

      // Valor: próxima célula não vazia que não seja outro rótulo
      let value = ''
      for (let k = c + 1; k < Math.min(c + 4, row.length); k++) {
        const candidate = cell(rows, r, k)
        if (!candidate) continue
        if (isProcessLabel(candidate)) break
        value = candidate
        break
      }
      if (!value) continue

      if (label === 'Nº' || label === 'N°' || label === 'NO' || label === 'NUMERO') {
        out.numero = formatConmedNumero(value)
      } else if (label === 'DATA' && !out.data) {
        out.data = normalizeImportDate(value)
      } else if (label === 'PROCESSO') {
        // No MODELO o valor do processo às vezes fica vazio; evita engolir "FORNECEDOR"
        if (!isProcessLabel(value)) out.processo = formatConmedProcesso(value)
      } else if (label.includes('PREGAO') || label.includes('TAD')) {
        out.pregaoTad = formatConmedPregaoTad(value)
      } else if (label.includes('VIGENCIA')) {
        out.vigencia = value
      } else if (label.includes('FORNECEDOR')) {
        out.fornecedor = value
      }
    }
  }

  // Fallback MODELO: Nº/DATA/PREGÃO na linha 0–1 mesmo sem bloco "DADOS DO PROCESSO"
  if (!out.numero || !out.pregaoTad || !out.fornecedor) {
    for (let r = 0; r < Math.min(endExclusive, 5); r++) {
      const row = rows[r] ?? []
      for (let c = 0; c < row.length; c++) {
        const label = norm(cell(rows, r, c)).replace(/:$/, '')
        const value = cell(rows, r, c + 1) || cell(rows, r, c + 2)
        if (!value || isProcessLabel(value)) continue
        if (!out.numero && (label === 'Nº' || label === 'N°' || label === 'NUMERO')) {
          out.numero = formatConmedNumero(value)
        }
        if (!out.data && label === 'DATA') out.data = normalizeImportDate(value)
        if (!out.pregaoTad && (label.includes('PREGAO') || label.includes('TAD'))) {
          out.pregaoTad = formatConmedPregaoTad(value.includes('/') ? value : cell(rows, r, c + 3) || value)
        }
        if (!out.fornecedor && label.includes('FORNECEDOR')) {
          out.fornecedor = value
        }
        if (!out.vigencia && label.includes('VIGENCIA')) {
          out.vigencia = value
        }
      }
    }
  }

  // PREGÃO às vezes fica em coluna distante (ex.: col 7)
  if (!out.pregaoTad) {
    for (let r = 0; r < Math.min(endExclusive, 4); r++) {
      for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
        if (!norm(cell(rows, r, c)).includes('PREGAO') && !norm(cell(rows, r, c)).includes('TAD')) {
          continue
        }
        for (let k = c + 1; k < Math.min(c + 5, rows[r].length); k++) {
          const v = cell(rows, r, k)
          if (v && !isProcessLabel(v)) {
            out.pregaoTad = formatConmedPregaoTad(v)
            break
          }
        }
      }
    }
  }

  return out
}

function parsePacientesFromRows(rows: string[][]): ConmedComrjPaciente[] {
  const headerIdx = findHeaderRow(rows)
  if (headerIdx < 0) return []

  const header = (rows[headerIdx] ?? []).map((v) => String(v ?? ''))
  const cols = resolveColumns(header)
  const iSeq = cols.seq ?? -1
  const iNip = cols.nip ?? -1
  const iIniciais = cols.iniciais ?? -1
  const iData = cols.data ?? -1
  const iProc = cols.procedimento ?? -1
  const iMapa = cols.mapa ?? -1
  const iDanfe = cols.danfe ?? -1
  const iItem = cols.item ?? -1
  const iNeb = cols.nebPi ?? -1
  const iDesc = cols.descricao ?? -1
  const iQt = cols.qt ?? -1
  const iUnit = cols.valorUnit ?? -1

  if (iNip < 0 && iMapa < 0 && iDesc < 0) return []

  const pacientes: ConmedComrjPaciente[] = []
  let current: ConmedComrjPaciente | null = null
  let carryMapa = ''
  let carryDanfe = ''

  const pushCurrent = () => {
    if (!current) return
    const ready = withRecalculatedPaciente(current)
    if (pacienteHasContent(ready) || ready.materiais.length > 0) {
      pacientes.push(ready)
    }
    current = null
    carryMapa = ''
    carryDanfe = ''
  }

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    if (row.every((c) => !String(c ?? '').trim())) continue

    const joined = row.map((c) => norm(String(c ?? ''))).join('|')
    if (joined.includes('VALOR POR PACIENTE')) continue
    if (joined.includes('DADOS DO PROCESSO') || joined.includes('DADOS DO PACIENTE')) break
    // Rodapé do MODELO (totais / observações / assinaturas)
    if (/^\d+[.)]/.test(cell(rows, r, 0)) && cell(rows, r, 0).length > 8) break
    if (norm(cell(rows, r, 0)).includes('OBSERVACAO')) break
    if (cell(rows, r, 0).includes('___')) break

    const seqRaw = iSeq >= 0 ? cell(rows, r, iSeq) : ''
    const nipRaw = iNip >= 0 ? cell(rows, r, iNip) : ''
    const iniciaisRaw = iIniciais >= 0 ? cell(rows, r, iIniciais) : ''
    const dataRaw = iData >= 0 ? cell(rows, r, iData) : ''
    const procRaw = iProc >= 0 ? cell(rows, r, iProc) : ''

    let mapaRaw = iMapa >= 0 ? cell(rows, r, iMapa) : ''
    let danfeRaw = iDanfe >= 0 ? cell(rows, r, iDanfe) : ''
    const itemRaw = iItem >= 0 ? cell(rows, r, iItem) : ''
    const nebRaw = iNeb >= 0 ? cell(rows, r, iNeb) : ''
    const descRaw = iDesc >= 0 ? cell(rows, r, iDesc) : ''
    const qtRaw = iQt >= 0 ? cell(rows, r, iQt) : ''
    const unitRaw = iUnit >= 0 ? cell(rows, r, iUnit) : ''

    const hasMaterialHint = Boolean(
      mapaRaw || danfeRaw || itemRaw || nebRaw || descRaw || qtRaw || unitRaw,
    )

    const patientSignal =
      looksLikeNip(nipRaw) ||
      (looksLikeSeq(seqRaw) && Boolean(nipRaw || iniciaisRaw || procRaw)) ||
      (Boolean(nipRaw || iniciaisRaw || procRaw) &&
        (Boolean(iniciaisRaw || procRaw) || !hasMaterialHint))

    const falsePatient =
      hasMaterialHint &&
      !looksLikeNip(nipRaw) &&
      !looksLikeSeq(seqRaw) &&
      !iniciaisRaw &&
      !procRaw

    if (patientSignal && !falsePatient) {
      pushCurrent()
      current = {
        ...createEmptyConmedPaciente(),
        nip: formatConmedPacienteNip(nipRaw),
        iniciais: formatConmedUppercase(iniciaisRaw),
        data: normalizeImportDate(dataRaw),
        procedimento: formatConmedUppercase(procRaw),
        materiais: [],
        valorPorPaciente: '',
      }
      carryMapa = mapaRaw
      carryDanfe = danfeRaw
    } else if (!current) {
      current = createEmptyConmedPaciente()
    } else {
      // Linhas seguintes do mesmo paciente: MAPA/DANFE vêm vazios por merge (covered)
      if (!mapaRaw) mapaRaw = carryMapa
      if (!danfeRaw) danfeRaw = carryDanfe
      if (mapaRaw) carryMapa = mapaRaw
      if (danfeRaw) carryDanfe = danfeRaw
    }

    const mat: ConmedComrjMaterialItem = {
      ...createEmptyConmedMaterialItem(),
      mapaDaSala: formatConmedNumerico(mapaRaw),
      danfe: formatConmedNumerico(danfeRaw),
      item: formatConmedNumerico(itemRaw),
      nebPi: formatConmedNebPi(nebRaw),
      descricao: formatConmedUppercase(descRaw),
      qt: formatConmedQuantidade(qtRaw),
      valorUnit: '',
      valorTotal: '',
    }

    if (unitRaw) {
      const n = parseValorBrasileiro(unitRaw)
      mat.valorUnit = n > 0 ? formatValorBrasileiro(n) : unitRaw.replace(/^R\$\s*/i, '').trim()
    }

    if (materialHasContent(mat) || mat.valorUnit) {
      current.materiais.push(mat)
    }
  }

  pushCurrent()
  return pacientes
}

export function parseConmedComrjFromGrid(rows: string[][]): ConmedComrjFormData {
  const processo = parseProcessoFromRows(rows)
  const pacientes = parsePacientesFromRows(rows)
  return {
    numero: processo.numero ?? '',
    data: processo.data ?? '',
    processo: processo.processo ?? '',
    pregaoTad: processo.pregaoTad ?? '',
    vigencia: processo.vigencia ?? '',
    fornecedor: processo.fornecedor ?? '',
    pacientes,
  }
}

/** Mescla importação com formulário atual (campos importados não vazios prevalecem). */
export function mergeConmedImport(
  current: ConmedComrjFormData,
  imported: ConmedComrjFormData,
): ConmedComrjFormData {
  return {
    numero: imported.numero || current.numero,
    data: imported.data || current.data,
    processo: imported.processo || current.processo,
    pregaoTad: imported.pregaoTad || current.pregaoTad,
    vigencia: imported.vigencia || current.vigencia,
    fornecedor: imported.fornecedor || current.fornecedor,
    pacientes: imported.pacientes.length > 0 ? imported.pacientes : current.pacientes,
  }
}

export async function loadConmedSheetsFromFile(file: File): Promise<SpreadsheetSheetImport[]> {
  return parseSpreadsheetSheetsFile(file)
}
