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

function colIndex(header: string[], ...aliases: string[]): number {
  const norms = header.map((h) => norm(h))
  for (const alias of aliases) {
    const a = norm(alias)
    const idx = norms.findIndex((h) => h === a || h.includes(a))
    if (idx >= 0) return idx
  }
  return -1
}

function parseProcessoFromRows(rows: string[][]): Partial<ConmedComrjFormData> {
  const out: Partial<ConmedComrjFormData> = {}
  const start = findRowContaining(rows, 'DADOS DO PROCESSO')
  const endExclusive =
    findRowContaining(rows, 'DADOS DO PACIENTE') >= 0
      ? findRowContaining(rows, 'DADOS DO PACIENTE')
      : Math.min(rows.length, (start >= 0 ? start : 0) + 12)

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
  const iNip = colIndex(header, 'NIP')
  const iIniciais = colIndex(header, 'INICIAIS')
  const iData = colIndex(header, 'DATA')
  const iProc = colIndex(header, 'PROCEDIMENTO')
  const iMapa = colIndex(header, 'MAPA DA SALA', 'MAPA', 'MAPA SALA')
  const iDanfe = colIndex(header, 'DANFE')
  const iItem = colIndex(header, 'ITEM')
  const iNeb = colIndex(header, 'NEB/PI', 'NEB', 'PI')
  const iDesc = colIndex(header, 'DESCRICAO DO MATERIAL', 'DESCRIÇÃO DO MATERIAL', 'DESCRICAO')
  const iQt = colIndex(header, 'QT', 'QTD', 'QUANTIDADE')
  const iUnit = colIndex(header, 'VALOR UNIT', 'VALOR UNITARIO', 'V. UNIT', 'UNIT')

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

    const hasPatientStart = Boolean(nipRaw || iniciaisRaw || procRaw)

    if (hasPatientStart) {
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
      // Linha só de material sem paciente aberto — ignora ou cria paciente vazio
      current = createEmptyConmedPaciente()
    }

    const mat: ConmedComrjMaterialItem = {
      ...createEmptyConmedMaterialItem(),
      mapaDaSala: iMapa >= 0 ? formatConmedNumerico(cell(rows, r, iMapa)) : '',
      danfe: iDanfe >= 0 ? formatConmedNumerico(cell(rows, r, iDanfe)) : '',
      item: iItem >= 0 ? formatConmedNumerico(cell(rows, r, iItem)) : '',
      nebPi: iNeb >= 0 ? formatConmedNebPi(cell(rows, r, iNeb)) : '',
      descricao: iDesc >= 0 ? formatConmedUppercase(cell(rows, r, iDesc)) : '',
      qt: iQt >= 0 ? formatConmedQuantidade(cell(rows, r, iQt)) : '',
      valorUnit: '',
      valorTotal: '',
    }

    const unitRaw = iUnit >= 0 ? cell(rows, r, iUnit) : ''
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
