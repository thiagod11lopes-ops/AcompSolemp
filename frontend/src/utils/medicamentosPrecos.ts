import seedData from '@/data/medicamentosPrecosSeed.json'
import { formatValorBrasileiro, parseValorBrasileiro } from '@/utils/consumoMaterialOds'
import { medicamentosPrecosService } from '@/services/medicamentosPrecosService'

export interface MedicamentoPrecoRow {
  id: string
  neb: string
  medicamento: string
  uf: string
  precoReferencia: string
}

export type MedicamentoPrecoColunaKey = keyof Omit<MedicamentoPrecoRow, 'id'>

export const MEDICAMENTOS_PRECOS_HEADERS: {
  key: MedicamentoPrecoColunaKey
  label: string
  width: number
}[] = [
  { key: 'neb', label: 'NEB', width: 120 },
  { key: 'medicamento', label: 'Medicamento', width: 420 },
  { key: 'uf', label: 'UF', width: 64 },
  { key: 'precoReferencia', label: 'Preço referência 2026', width: 150 },
]

export function createMedicamentoPrecoVazio(id?: string): MedicamentoPrecoRow {
  return {
    id: id ?? `med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    neb: '',
    medicamento: '',
    uf: '',
    precoReferencia: '',
  }
}

/** Catálogo da aba Preço de Medicamentos (persistido no IndexedDB, com fallback no seed). */
export function getMedicamentosPrecosCatalog(): MedicamentoPrecoRow[] {
  try {
    return medicamentosPrecosService.getRows()
  } catch {
    return seedData as MedicamentoPrecoRow[]
  }
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
