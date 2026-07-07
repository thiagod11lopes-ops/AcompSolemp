import { loadAppData, saveAppData } from '@/mocks/seed'
import type { ConsumoPlanilhaClinicaState } from '@/types'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'

const EMPTY_STATE: ConsumoPlanilhaClinicaState = {
  finalizedRowIds: [],
  finalizedAuditoriaRowIds: [],
  finalizedMaterialRowIds: [],
  extraRows: [],
}

function normalizeState(state: ConsumoPlanilhaClinicaState): ConsumoPlanilhaClinicaState {
  const finalizedAuditoriaRowIds =
    state.finalizedAuditoriaRowIds ?? [...state.finalizedRowIds]
  const finalizedMaterialRowIds = state.finalizedMaterialRowIds ?? []
  return {
    finalizedRowIds: [...finalizedAuditoriaRowIds],
    finalizedAuditoriaRowIds: [...finalizedAuditoriaRowIds],
    finalizedMaterialRowIds: [...finalizedMaterialRowIds],
    extraRows: state.extraRows.map((row) => ({ ...row })),
  }
}

export const consumoPlanilhaService = {
  getState(clinicaId: string): ConsumoPlanilhaClinicaState {
    const data = loadAppData()
    const state = data.consumoPlanilha?.[clinicaId]
    if (!state) return EMPTY_STATE
    return normalizeState(state)
  },

  saveState(clinicaId: string, state: ConsumoPlanilhaClinicaState): ConsumoPlanilhaClinicaState {
    const data = loadAppData()
    if (!data.consumoPlanilha) data.consumoPlanilha = {}
    const auditoria = state.finalizedAuditoriaRowIds ?? state.finalizedRowIds
    const next = normalizeState({
      ...state,
      finalizedAuditoriaRowIds: [...auditoria],
      finalizedMaterialRowIds: [...(state.finalizedMaterialRowIds ?? [])],
      finalizedRowIds: [...auditoria],
      extraRows: state.extraRows.map((row) => ({ ...row })),
    })
    data.consumoPlanilha[clinicaId] = next
    saveAppData(data)
    return next
  },

  markRowsFinalizedAuditoria(
    clinicaId: string,
    rows: ConsumoMaterialRow[],
  ): ConsumoPlanilhaClinicaState {
    const data = loadAppData()
    if (!data.consumoPlanilha) data.consumoPlanilha = {}
    const current = normalizeState(
      data.consumoPlanilha[clinicaId] ?? EMPTY_STATE,
    )

    for (const row of rows) {
      if (!current.finalizedAuditoriaRowIds!.includes(row.id)) {
        current.finalizedAuditoriaRowIds!.push(row.id)
      }
      const index = current.extraRows.findIndex((item) => item.id === row.id)
      if (index >= 0) {
        current.extraRows[index] = row
      } else {
        current.extraRows.push({ ...row })
      }
    }

    current.finalizedRowIds = [...current.finalizedAuditoriaRowIds!]
    data.consumoPlanilha[clinicaId] = current
    saveAppData(data)
    return consumoPlanilhaService.getState(clinicaId)
  },

  markRowsFinalizedMaterial(
    clinicaId: string,
    rows: ConsumoMaterialRow[],
  ): ConsumoPlanilhaClinicaState {
    const data = loadAppData()
    if (!data.consumoPlanilha) data.consumoPlanilha = {}
    const current = normalizeState(
      data.consumoPlanilha[clinicaId] ?? EMPTY_STATE,
    )

    for (const row of rows) {
      if (!current.finalizedMaterialRowIds!.includes(row.id)) {
        current.finalizedMaterialRowIds!.push(row.id)
      }
      const index = current.extraRows.findIndex((item) => item.id === row.id)
      if (index >= 0) {
        current.extraRows[index] = row
      } else {
        current.extraRows.push({ ...row })
      }
    }

    data.consumoPlanilha[clinicaId] = current
    saveAppData(data)
    return consumoPlanilhaService.getState(clinicaId)
  },

  /** @deprecated Use markRowsFinalizedAuditoria */
  markRowsFinalized(
    clinicaId: string,
    rows: ConsumoMaterialRow[],
  ): ConsumoPlanilhaClinicaState {
    return consumoPlanilhaService.markRowsFinalizedAuditoria(clinicaId, rows)
  },

  clearState(clinicaId: string): void {
    const data = loadAppData()
    if (!data.consumoPlanilha?.[clinicaId]) return
    delete data.consumoPlanilha[clinicaId]
    saveAppData(data)
  },
}
