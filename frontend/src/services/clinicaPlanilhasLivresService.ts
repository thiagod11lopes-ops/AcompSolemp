import { loadAppData, saveAppData } from '@/mocks/seed'
import type { ClinicaPlanilhasLivresState, PlanilhaLivreAba } from '@/types'
import {
  normalizeSheetData,
  sheetFromPlainGrid,
  type PlanilhaSheetData,
} from '@/utils/planilhaBrancaGrid'

const EMPTY_STATE: ClinicaPlanilhasLivresState = {
  abas: [],
  abaAtivaId: null,
}

export function resolveAbaSheet(aba: PlanilhaLivreAba): PlanilhaSheetData {
  if (aba.sheet) return normalizeSheetData(aba.sheet)
  return sheetFromPlainGrid(aba.grid)
}

function normalizeAba(aba: PlanilhaLivreAba): PlanilhaLivreAba {
  const sheet = resolveAbaSheet(aba)
  return {
    id: aba.id,
    nome: aba.nome,
    sheet,
  }
}

function normalizeState(state: ClinicaPlanilhasLivresState | undefined): ClinicaPlanilhasLivresState {
  if (!state) return { ...EMPTY_STATE, abas: [] }
  const abas: PlanilhaLivreAba[] = (state.abas ?? []).map(normalizeAba)
  const abaAtivaId =
    state.abaAtivaId && abas.some((aba) => aba.id === state.abaAtivaId)
      ? state.abaAtivaId
      : (abas[0]?.id ?? null)
  return { abas, abaAtivaId }
}

export const clinicaPlanilhasLivresService = {
  getState(clinicaId: string): ClinicaPlanilhasLivresState {
    const data = loadAppData()
    return normalizeState(data.planilhasLivres?.[clinicaId])
  },

  saveState(clinicaId: string, state: ClinicaPlanilhasLivresState): ClinicaPlanilhasLivresState {
    const data = loadAppData()
    if (!data.planilhasLivres) data.planilhasLivres = {}
    const next = normalizeState(state)
    data.planilhasLivres[clinicaId] = next
    saveAppData(data)
    return next
  },

  clearState(clinicaId: string): void {
    const data = loadAppData()
    if (!data.planilhasLivres?.[clinicaId]) return
    delete data.planilhasLivres[clinicaId]
    saveAppData(data)
  },
}
