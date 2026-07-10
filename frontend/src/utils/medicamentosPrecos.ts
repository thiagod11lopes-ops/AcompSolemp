import seedData from '@/data/medicamentosPrecosSeed.json'
import { formatValorBrasileiro, parseValorBrasileiro } from '@/utils/consumoMaterialOds'

export interface MedicamentoPrecoRow {
  id: string
  neb: string
  medicamento: string
  uf: string
  precoReferencia: string
}

export const MEDICAMENTOS_PRECOS_HEADERS = [
  { key: 'neb' as const, label: 'NEB', width: 120 },
  { key: 'medicamento' as const, label: 'Medicamento', width: 420 },
  { key: 'uf' as const, label: 'UF', width: 64 },
  { key: 'precoReferencia' as const, label: 'Preço referência 2026', width: 150 },
]

/** Catálogo da aba Preço de Medicamentos (coluna Medicamento + preço referência). */
export function getMedicamentosPrecosCatalog(): MedicamentoPrecoRow[] {
  return seedData as MedicamentoPrecoRow[]
}

export function formatPrecoReferenciaMedicamento(precoReferencia: string): string {
  const trimmed = precoReferencia.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('R$')) return trimmed
  const valor = parseValorBrasileiro(trimmed)
  return valor > 0 ? formatValorBrasileiro(valor) : trimmed
}

export function findMedicamentoPrecoByNome(
  nome: string,
  catalog: MedicamentoPrecoRow[] = getMedicamentosPrecosCatalog(),
): MedicamentoPrecoRow | undefined {
  const needle = nome.trim().toLowerCase()
  if (!needle) return undefined
  return catalog.find((row) => row.medicamento.trim().toLowerCase() === needle)
}
