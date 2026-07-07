import { loadAppData, saveAppData } from '@/mocks/seed'
import type { ConsumoPlanilhaClinicaState } from '@/types'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'

const EMPTY_STATE: ConsumoPlanilhaClinicaState = {
  finalizedRowIds: [],
  extraRows: [],
}

export const consumoPlanilhaService = {
  getState(clinicaId: string): ConsumoPlanilhaClinicaState {
    const data = loadAppData()
    const state = data.consumoPlanilha?.[clinicaId]
    if (!state) return EMPTY_STATE
    return {
      finalizedRowIds: [...state.finalizedRowIds],
      extraRows: state.extraRows.map((row) => ({ ...row })),
    }
  },

  saveState(clinicaId: string, state: ConsumoPlanilhaClinicaState): ConsumoPlanilhaClinicaState {
    const data = loadAppData()
    if (!data.consumoPlanilha) data.consumoPlanilha = {}
    const next = {
      finalizedRowIds: [...state.finalizedRowIds],
      extraRows: state.extraRows.map((row) => ({ ...row })),
    }
    data.consumoPlanilha[clinicaId] = next
    saveAppData(data)
    return next
  },

  markRowsFinalized(
    clinicaId: string,
    rows: ConsumoMaterialRow[],
  ): ConsumoPlanilhaClinicaState {
    const data = loadAppData()
    if (!data.consumoPlanilha) data.consumoPlanilha = {}
    const current = data.consumoPlanilha[clinicaId] ?? {
      finalizedRowIds: [],
      extraRows: [],
    }

    for (const row of rows) {
      if (!current.finalizedRowIds.includes(row.id)) {
        current.finalizedRowIds.push(row.id)
      }
      const index = current.extraRows.findIndex((item) => item.id === row.id)
      if (index >= 0) {
        current.extraRows[index] = row
      } else {
        current.extraRows.push({ ...row })
      }
    }

    data.consumoPlanilha[clinicaId] = {
      finalizedRowIds: [...current.finalizedRowIds],
      extraRows: current.extraRows.map((item) => ({ ...item })),
    }
    saveAppData(data)
    return consumoPlanilhaService.getState(clinicaId)
  },

  clearState(clinicaId: string): void {
    const data = loadAppData()
    if (!data.consumoPlanilha?.[clinicaId]) return
    delete data.consumoPlanilha[clinicaId]
    saveAppData(data)
  },
}
