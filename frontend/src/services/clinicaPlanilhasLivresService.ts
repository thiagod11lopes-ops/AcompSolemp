import { loadAppData, saveAppData } from '@/mocks/seed'
import type { ClinicaPlanilhasLivresState } from '@/types'
import { ensureFixedPlanilhas } from '@/utils/planilhasFixas'
import { normalizeConmedComrjForm } from '@/utils/conmedComrjForm'
import { normalizeImhAbaForm } from '@/utils/imhAbaForm'
import { normalizeConsumoMaterialRows } from '@/utils/consumoMaterialOds'

export { resolveAbaSheet } from '@/utils/planilhasFixas'

function normalizeState(state: ClinicaPlanilhasLivresState | undefined): ClinicaPlanilhasLivresState {
  const abas = ensureFixedPlanilhas(state?.abas ?? [])
  const abaAtivaId =
    state?.abaAtivaId && abas.some((aba) => aba.id === state.abaAtivaId)
      ? state.abaAtivaId
      : (abas[0]?.id ?? null)
  return {
    abas,
    abaAtivaId,
    conmedComrj: normalizeConmedComrjForm(state?.conmedComrj),
    imh: normalizeImhAbaForm(state?.imh),
    consumoMaterialConsignado: normalizeConsumoMaterialRows(state?.consumoMaterialConsignado),
  }
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
