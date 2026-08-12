import seedData from '@/data/pacientesPmeSeed.json'

export interface PacientePmeRow {
  id: string
  nome: string
  nipUsuario: string
  nipTitular: string
  postoGradTitular: string
  vinculo: string
}

export type PacientePmeColunaKey = keyof Omit<PacientePmeRow, 'id'>

export const PACIENTES_PME_HEADERS: {
  key: PacientePmeColunaKey
  label: string
  width: number
}[] = [
  { key: 'nome', label: 'NOME', width: 320 },
  { key: 'nipUsuario', label: 'NIP DO USUÁRIO', width: 140 },
  { key: 'nipTitular', label: 'NIP DO TITULAR', width: 140 },
  { key: 'postoGradTitular', label: 'POSTO/GRAD DO TITULAR', width: 140 },
  { key: 'vinculo', label: 'VÍNCULO', width: 220 },
]

type SeedFile = {
  headers: string[]
  rows: Array<{
    nome: string
    nipUsuario: string
    nipTitular: string
    postoGradTitular: string
    vinculo: string
  }>
}

export function createEmptyPacientePmeRow(id?: string): PacientePmeRow {
  return {
    id: id ?? `paciente-pme-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nome: '',
    nipUsuario: '',
    nipTitular: '',
    postoGradTitular: '',
    vinculo: '',
  }
}

export function clonePacientesPmeSeed(): PacientePmeRow[] {
  const data = seedData as SeedFile
  return data.rows.map((row, index) => ({
    id: `paciente-pme-seed-${index + 1}`,
    nome: row.nome ?? '',
    nipUsuario: row.nipUsuario ?? '',
    nipTitular: row.nipTitular ?? '',
    postoGradTitular: row.postoGradTitular ?? '',
    vinculo: row.vinculo ?? '',
  }))
}

export function normalizePacientesPmeRows(
  rows: PacientePmeRow[] | undefined,
): PacientePmeRow[] {
  if (!Array.isArray(rows) || rows.length === 0) return []
  return rows
    .filter((row) => row && typeof row === 'object')
    .map((row, index) => ({
      id: row.id || `paciente-pme-${index + 1}`,
      nome: row.nome ?? '',
      nipUsuario: row.nipUsuario ?? '',
      nipTitular: row.nipTitular ?? '',
      postoGradTitular: row.postoGradTitular ?? '',
      vinculo: row.vinculo ?? '',
    }))
    .filter(
      (row) =>
        row.nome.trim() ||
        row.nipUsuario.trim() ||
        row.nipTitular.trim() ||
        row.postoGradTitular.trim() ||
        row.vinculo.trim(),
    )
}

export function formatPacientePmeUpper(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toUpperCase()
}

/** Chave de comparação de NIP (só dígitos). */
export function normalizePacienteNipKey(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function findPacientePmeByNip(
  nip: string,
  rows: PacientePmeRow[],
): PacientePmeRow | undefined {
  const key = normalizePacienteNipKey(nip)
  if (!key) return undefined
  return rows.find((row) => normalizePacienteNipKey(row.nipUsuario) === key)
}

export type PacientePmeNipMatch = {
  row: PacientePmeRow
  /** true quando NIP DO USUÁRIO = NIP DO TITULAR */
  isTitular: boolean
}

/** Resolve o NIP digitado apenas na coluna NIP DO USUÁRIO. */
export function resolvePacientePmeFromNip(
  nip: string,
  rows: PacientePmeRow[],
): PacientePmeNipMatch | null {
  const asUsuario = findPacientePmeByNip(nip, rows)
  if (!asUsuario) return null
  return {
    row: asUsuario,
    isTitular: pacienteNipsIguais(asUsuario),
  }
}

export function pacienteNipsIguais(row: PacientePmeRow): boolean {
  const userKey = normalizePacienteNipKey(row.nipUsuario)
  const titularKey = normalizePacienteNipKey(row.nipTitular)
  return Boolean(userKey) && (!titularKey || titularKey === userKey)
}

export function findPacientePmeByNome(
  nome: string,
  rows: PacientePmeRow[],
): PacientePmeRow | undefined {
  const key = formatPacientePmeUpper(nome)
  if (!key) return undefined
  return rows.find((row) => formatPacientePmeUpper(row.nome) === key)
}

export function searchPacientesPmeByNome(
  nome: string,
  rows: PacientePmeRow[],
  limit = 25,
): PacientePmeRow[] {
  const q = formatPacientePmeUpper(nome)
  if (!q) return rows.slice(0, limit)
  return rows
    .filter((row) => formatPacientePmeUpper(row.nome).includes(q))
    .slice(0, limit)
}

/** Dados mínimos do lançamento IMH para cadastrar paciente novo. */
export type PacientePmeFromLancamento = {
  nip: string
  nome: string
  nipTitular: string
  postoGrad: string
  vinculo: string
}

/**
 * Se o NIP DO USUÁRIO ainda não existir na lista, acrescenta uma linha.
 * Retorna a lista original se já existir ou se o NIP estiver vazio.
 */
export function ensurePacientePmeFromLancamento(
  rows: PacientePmeRow[],
  lancamento: PacientePmeFromLancamento,
): PacientePmeRow[] {
  const nipKey = normalizePacienteNipKey(lancamento.nip)
  if (!nipKey) return rows
  if (findPacientePmeByNip(lancamento.nip, rows)) return rows

  const nipUsuario = lancamento.nip.trim()
  const nipTitular = lancamento.nipTitular.trim() || nipUsuario
  const novo: PacientePmeRow = {
    ...createEmptyPacientePmeRow(),
    nome: formatPacientePmeUpper(lancamento.nome),
    nipUsuario,
    nipTitular,
    postoGradTitular: formatPacientePmeUpper(lancamento.postoGrad),
    vinculo: formatPacientePmeUpper(lancamento.vinculo),
  }
  return [...rows, novo]
}
