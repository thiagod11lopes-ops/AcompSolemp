import type {
  ConmedComrjFormData,
  ConmedComrjMaterialItem,
  ConmedComrjPaciente,
} from '@/types'
import {
  createEmptyConmedMaterialItem,
  createEmptyConmedPaciente,
  formatConmedData,
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
  if (n === '#' || n === 'N' || n === 'Nº' || n === 'N°') return true
  return false
}

type FieldKey =
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

/** Match por pontuação: exact > startsWith > includes (sem aliases curtos perigosos). */
function scoreHeader(header: string, aliases: string[]): number {
  const h = norm(header)
  if (!h || isIgnoredHeader(header)) return -1
  let best = -1
  for (const alias of aliases) {
    const a = norm(alias)
    if (!a) continue
    if (h === a) best = Math.max(best, 100)
    else if (h.startsWith(a) || a.startsWith(h)) best = Math.max(best, 80)
    else if (h.includes(a) && a.length >= 4) best = Math.max(best, 60)
  }
  return best
}

function resolveColumns(header: string[]): Partial<Record<FieldKey, number>> {
  const specs: { key: FieldKey; aliases: string[] }[] = [
    { key: 'nip', aliases: ['NIP'] },
    { key: 'iniciais', aliases: ['INICIAIS'] },
    { key: 'data', aliases: ['DATA'] },
    { key: 'procedimento', aliases: ['PROCEDIMENTO'] },
    { key: 'mapa', aliases: ['MAPA DA SALA', 'MAPA SALA'] },
    { key: 'danfe', aliases: ['DANFE'] },
    { key: 'item', aliases: ['ITEM'] },
    { key: 'nebPi', aliases: ['NEB/PI', 'NEB PI', 'NEB'] },
    {
      key: 'descricao',
      aliases: ['DESCRICAO DO MATERIAL', 'DESCRIÇÃO DO MATERIAL', 'DESCRICAO'],
    },
    { key: 'qt', aliases: ['QT', 'QTD', 'QUANTIDADE'] },
    { key: 'valorUnit', aliases: ['VALOR UNIT', 'VALOR UNITARIO', 'V. UNIT'] },
    { key: 'valorTotal', aliases: ['VALOR TOTAL'] },
  ]

  const used = new Set<number>()
  const out: Partial<Record<FieldKey, number>> = {}

  // Campos mais específicos primeiro (evita DATA/ITEM pegarem coluna errada)
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
  ]

  for (const key of order) {
    const spec = specs.find((s) => s.key === key)!
    let bestIdx = -1
    let bestScore = -1
    header.forEach((label, idx) => {
      if (used.has(idx)) return
      const score = scoreHeader(label, spec.aliases)
      if (score > bestScore) {
        bestScore = score
        bestIdx = idx
      }
    })
    if (bestIdx >= 0 && bestScore >= 60) {
      out[key] = bestIdx
      used.add(bestIdx)
    }
  }

  // Fallback posicional no layout do preview (sem AÇÕES):
  // NIP INICIAIS DATA PROCEDIMENTO | MAPA DANFE ITEM NEB/PI DESC QT UNIT TOTAL
  if (
    out.nip == null &&
    out.mapa == null &&
    out.descricao == null &&
    header.some((h) => norm(h).includes('NIP') || norm(h).includes('MAPA'))
  ) {
    const base = header.findIndex((h) => {
      const n = norm(h)
      return n === 'NIP' || n.includes('NIP')
    })
    if (base >= 0) {
      const map: FieldKey[] = [
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
        if (out[key] == null && base + offset < header.length) {
          const label = header[base + offset]
          if (!isIgnoredHeader(label) || !label.trim()) out[key] = base + offset
        }
      })
    }
  }

  // Layout do sistema COM coluna AÇÕES entre procedimento e mapa
  if (out.procedimento != null && out.mapa == null) {
    const afterProc = out.procedimento + 1
    const maybeAcoes = norm(header[afterProc] ?? '')
    if (maybeAcoes.includes('ACOE') || maybeAcoes === '') {
      const mapFromMapa: FieldKey[] = [
        'mapa',
        'danfe',
        'item',
        'nebPi',
        'descricao',
        'qt',
        'valorUnit',
        'valorTotal',
      ]
      const start = afterProc + 1
      mapFromMapa.forEach((key, offset) => {
        if (out[key] == null) out[key] = start + offset
      })
    }
  }

  return out
}

function looksLikeNip(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 6 && digits.length <= 8
}

function looksLikeDate(value: string): boolean {
  const n = norm(value)
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(n)) return true
  if (/^\d{8}$/.test(value.replace(/\D/g, '')) && value.replace(/\D/g, '').length === 8) return true
  return false
}

function parseProcessoFromRows(rows: string[][]): Partial<ConmedComrjFormData> {
  const out: Partial<ConmedComrjFormData> = {}
  const start = findRowContaining(rows, 'DADOS DO PROCESSO')
  const pacienteBlock = findRowContaining(rows, 'DADOS DO PACIENTE')
  const endExclusive =
    pacienteBlock >= 0 ? pacienteBlock : Math.min(rows.length, (start >= 0 ? start : 0) + 12)

  const from = start >= 0 ? start : 0
  for (let r = from; r < endExclusive; r++) {
    const row = rows[r] ?? []
    for (let c = 0; c < row.length; c++) {
      const label = norm(cell(rows, r, c))
      const value = cell(rows, r, c + 1)
      if (!value) continue
      if (label === 'Nº' || label === 'N°' || label === 'NO' || label === 'NUMERO') {
        out.numero = formatConmedNumero(value)
      } else if (label === 'DATA' && !out.data) {
        out.data = formatConmedData(value)
      } else if (label === 'PROCESSO') {
        out.processo = formatConmedProcesso(value)
      } else if (label.includes('PREGAO') || label.includes('TAD')) {
        out.pregaoTad = formatConmedPregaoTad(value)
      } else if (label.includes('VIGENCIA')) {
        out.vigencia = value
      } else if (label.includes('FORNECEDOR')) {
        out.fornecedor = value
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

  const pushCurrent = () => {
    if (!current) return
    const ready = withRecalculatedPaciente(current)
    if (pacienteHasContent(ready) || ready.materiais.length > 0) {
      pacientes.push(ready)
    }
    current = null
  }

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    if (row.every((c) => !String(c ?? '').trim())) continue

    const joined = row.map((c) => norm(String(c ?? ''))).join('|')
    if (joined.includes('VALOR POR PACIENTE')) continue
    if (joined.includes('DADOS DO PROCESSO') || joined.includes('DADOS DO PACIENTE')) break

    const nipRaw = iNip >= 0 ? cell(rows, r, iNip) : ''
    const iniciaisRaw = iIniciais >= 0 ? cell(rows, r, iIniciais) : ''
    const dataRaw = iData >= 0 ? cell(rows, r, iData) : ''
    const procRaw = iProc >= 0 ? cell(rows, r, iProc) : ''

    const mapaRaw = iMapa >= 0 ? cell(rows, r, iMapa) : ''
    const danfeRaw = iDanfe >= 0 ? cell(rows, r, iDanfe) : ''
    const itemRaw = iItem >= 0 ? cell(rows, r, iItem) : ''
    const nebRaw = iNeb >= 0 ? cell(rows, r, iNeb) : ''
    const descRaw = iDesc >= 0 ? cell(rows, r, iDesc) : ''
    const qtRaw = iQt >= 0 ? cell(rows, r, iQt) : ''
    const unitRaw = iUnit >= 0 ? cell(rows, r, iUnit) : ''

    const hasMaterialHint = Boolean(mapaRaw || danfeRaw || itemRaw || nebRaw || descRaw || qtRaw || unitRaw)

    // Novo paciente: NIP típico, ou bloco paciente preenchido sem ser só eco de material
    const patientSignal =
      looksLikeNip(nipRaw) ||
      (Boolean(nipRaw || iniciaisRaw || procRaw) &&
        (Boolean(iniciaisRaw || procRaw || looksLikeDate(dataRaw)) || !hasMaterialHint))

    // Evita abrir paciente novo quando a célula "NIP" na verdade recebeu dado de material
    // (falha residual): se só tem mapa/danfe/desc e nip não parece NIP, trata como material.
    const falsePatient =
      hasMaterialHint &&
      !looksLikeNip(nipRaw) &&
      !iniciaisRaw &&
      !procRaw &&
      !looksLikeDate(dataRaw)

    if (patientSignal && !falsePatient) {
      pushCurrent()
      current = {
        ...createEmptyConmedPaciente(),
        nip: formatConmedPacienteNip(nipRaw),
        iniciais: formatConmedUppercase(iniciaisRaw),
        data: formatConmedData(dataRaw),
        procedimento: formatConmedUppercase(procRaw),
        materiais: [],
        valorPorPaciente: '',
      }
    } else if (!current) {
      current = createEmptyConmedPaciente()
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
      mat.valorUnit = n > 0 ? formatValorBrasileiro(n) : unitRaw
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
