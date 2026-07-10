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
