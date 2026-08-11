import {
  createEmptySheetData,
  normalizeSheetData,
  sheetFromPlainGrid,
  type PlanilhaSheetData,
} from '@/utils/planilhaBrancaGrid'
import type { PlanilhaLivreAba } from '@/types'

export const FIXED_PLANILHAS = [
  { id: 'consumo-material-consignado', nome: 'Consumo Material Consignado' },
  { id: 'conmed-comrj', nome: 'CONMED COMRJ' },
  { id: 'lista-de-materiais', nome: 'Lista de Materiais' },
  { id: 'plan1', nome: 'Plan1' },
  { id: 'imh', nome: 'IMH' },
] as const

export type FixedPlanilhaId = (typeof FIXED_PLANILHAS)[number]['id']

function normalizeNome(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function resolveAbaSheet(aba: PlanilhaLivreAba): PlanilhaSheetData {
  if (aba.sheet) return normalizeSheetData(aba.sheet)
  return sheetFromPlainGrid(aba.grid)
}

/** Garante as 5 abas fixas; preserva conteúdo já salvo quando possível. */
export function ensureFixedPlanilhas(abas: PlanilhaLivreAba[]): PlanilhaLivreAba[] {
  const byId = new Map(abas.map((aba) => [aba.id, aba]))
  const byNome = new Map(abas.map((aba) => [normalizeNome(aba.nome), aba]))

  return FIXED_PLANILHAS.map((fixed) => {
    const byExactId = byId.get(fixed.id)
    const byExactNome = byNome.get(normalizeNome(fixed.nome))
    const fallbackPrimeira =
      fixed.id === 'consumo-material-consignado' && !byExactId && !byExactNome
        ? abas[0]
        : undefined
    const source = byExactId ?? byExactNome ?? fallbackPrimeira
    return {
      id: fixed.id,
      nome: fixed.nome,
      sheet: source ? resolveAbaSheet(source) : createEmptySheetData(),
    }
  })
}

export function defaultFixedPlanilhas(): PlanilhaLivreAba[] {
  return FIXED_PLANILHAS.map((fixed) => ({
    id: fixed.id,
    nome: fixed.nome,
    sheet: createEmptySheetData(),
  }))
}
