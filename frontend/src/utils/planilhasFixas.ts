import {
  createEmptySheetData,
  normalizeSheetData,
  sheetFromPlainGrid,
  type PlanilhaSheetData,
} from '@/utils/planilhaBrancaGrid'
import type { PlanilhaLivreAba } from '@/types'

/** Abas fixas do portal clínica (material consignado). */
export const FIXED_PLANILHAS = [
  { id: 'consumo-material-consignado', nome: 'Consumo Material Consignado' },
  { id: 'conmed-comrj', nome: 'CONMED COMRJ' },
  { id: 'lista-de-materiais', nome: 'Lista de Materiais' },
  { id: 'plan1', nome: 'Plan1' },
  { id: 'imh', nome: 'IMH' },
] as const

/** Abas fixas do portal medicamento. */
export const FIXED_PLANILHAS_MEDICAMENTO = [
  { id: 'imh', nome: 'IMH' },
  { id: 'lista-de-medicamentos', nome: 'Lista de Medicamentos' },
  { id: 'pacientes', nome: 'Pacientes' },
] as const

export type PlanilhasModo = 'clinica' | 'medicamento'

export type FixedPlanilhaId =
  | (typeof FIXED_PLANILHAS)[number]['id']
  | (typeof FIXED_PLANILHAS_MEDICAMENTO)[number]['id']

export function getFixedPlanilhas(modo: PlanilhasModo = 'clinica') {
  return modo === 'medicamento' ? FIXED_PLANILHAS_MEDICAMENTO : FIXED_PLANILHAS
}

function normalizeNome(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function resolveAbaSheet(aba: PlanilhaLivreAba): PlanilhaSheetData {
  if (aba.sheet) return normalizeSheetData(aba.sheet)
  return sheetFromPlainGrid(aba.grid)
}

/** Garante as abas fixas do modo; preserva conteúdo já salvo quando possível. */
export function ensureFixedPlanilhas(
  abas: PlanilhaLivreAba[],
  modo: PlanilhasModo = 'clinica',
): PlanilhaLivreAba[] {
  const fixedList = getFixedPlanilhas(modo)
  const byId = new Map(abas.map((aba) => [aba.id, aba]))
  const byNome = new Map(abas.map((aba) => [normalizeNome(aba.nome), aba]))

  return fixedList.map((fixed) => {
    const byExactId = byId.get(fixed.id)
    const byExactNome = byNome.get(normalizeNome(fixed.nome))
    const fallbackPrimeira =
      modo === 'clinica' &&
      fixed.id === 'consumo-material-consignado' &&
      !byExactId &&
      !byExactNome
        ? abas[0]
        : undefined
    const source = byExactId ?? byExactNome ?? fallbackPrimeira
    return {
      id: fixed.id,
      nome: fixed.nome,
      // Medicamento: abas vazias por enquanto (sem carregar grid legado).
      sheet:
        modo === 'medicamento'
          ? createEmptySheetData()
          : source
            ? resolveAbaSheet(source)
            : createEmptySheetData(),
    }
  })
}

export function defaultFixedPlanilhas(modo: PlanilhasModo = 'clinica'): PlanilhaLivreAba[] {
  return getFixedPlanilhas(modo).map((fixed) => ({
    id: fixed.id,
    nome: fixed.nome,
    sheet: createEmptySheetData(),
  }))
}
