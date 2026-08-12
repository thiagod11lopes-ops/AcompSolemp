import { loadAppData, saveAppData } from '@/mocks/seed'
import type { ClinicaPlanilhasLivresState } from '@/types'
import {
  ensureFixedPlanilhas,
  type PlanilhasModo,
} from '@/utils/planilhasFixas'
import { normalizeConmedComrjForm } from '@/utils/conmedComrjForm'
import { normalizeImhAbaForm } from '@/utils/imhAbaForm'
import { normalizeImhMedicamentoForm } from '@/utils/imhMedicamentoForm'
import {
  listaMedicamentosFromPrecosRows,
  listaMedicamentosToPrecosRows,
  normalizeListaMedicamentosForm,
} from '@/utils/listaMedicamentosForm'
import { normalizeListaMateriaisForm } from '@/utils/listaMateriaisForm'
import { normalizeConsumoMaterialRows } from '@/utils/consumoMaterialOds'
import { medicamentosPrecosService } from '@/services/medicamentosPrecosService'

export { resolveAbaSheet } from '@/utils/planilhasFixas'

function normalizeState(
  state: ClinicaPlanilhasLivresState | undefined,
  modo: PlanilhasModo = 'clinica',
): ClinicaPlanilhasLivresState {
  const abas = ensureFixedPlanilhas(state?.abas ?? [], modo)
  const abaAtivaId =
    state?.abaAtivaId && abas.some((aba) => aba.id === state.abaAtivaId)
      ? state.abaAtivaId
      : (abas[0]?.id ?? null)
  const listaMedicamentosFromState = normalizeListaMedicamentosForm(state?.listaMedicamentos)
  const listaMedicamentos =
    state?.listaMedicamentos !== undefined
      ? listaMedicamentosFromState
      : modo === 'medicamento'
        ? listaMedicamentosFromPrecosRows(medicamentosPrecosService.getRows())
        : listaMedicamentosFromState
  return {
    abas,
    abaAtivaId,
    conmedComrj: normalizeConmedComrjForm(state?.conmedComrj),
    imh: normalizeImhAbaForm(state?.imh),
    imhMedicamento: normalizeImhMedicamentoForm(state?.imhMedicamento),
    listaMedicamentos,
    listaMateriais: normalizeListaMateriaisForm(state?.listaMateriais),
    consumoMaterialConsignado: normalizeConsumoMaterialRows(state?.consumoMaterialConsignado),
  }
}

export const clinicaPlanilhasLivresService = {
  getState(
    clinicaId: string,
    modo: PlanilhasModo = 'clinica',
  ): ClinicaPlanilhasLivresState {
    const data = loadAppData()
    return normalizeState(data.planilhasLivres?.[clinicaId], modo)
  },

  saveState(
    clinicaId: string,
    state: ClinicaPlanilhasLivresState,
    modo: PlanilhasModo = 'clinica',
  ): ClinicaPlanilhasLivresState {
    const data = loadAppData()
    if (!data.planilhasLivres) data.planilhasLivres = {}
    const next = normalizeState(state, modo)
    data.planilhasLivres[clinicaId] = next
    if (modo === 'medicamento' && next.listaMedicamentos) {
      data.medicamentosPrecos = listaMedicamentosToPrecosRows(next.listaMedicamentos)
    }
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
