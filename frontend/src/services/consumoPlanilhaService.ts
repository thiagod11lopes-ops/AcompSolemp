import { loadAppData, saveAppData } from '@/mocks/seed'
import type { ConsumoPlanilhaAba, ConsumoPlanilhaClinicaState } from '@/types'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'

export const CONSUMO_ABA_PRINCIPAL_ID = 'principal'

const EMPTY_STATE: ConsumoPlanilhaClinicaState = {
  finalizedRowIds: [],
  finalizedAuditoriaRowIds: [],
  finalizedMaterialRowIds: [],
  extraRows: [],
  abasExtras: [],
  abaAtivaId: CONSUMO_ABA_PRINCIPAL_ID,
}

function normalizeAbas(abas: ConsumoPlanilhaAba[] | undefined): ConsumoPlanilhaAba[] {
  return (abas ?? [])
    .filter((aba) => (aba as { tipo?: string }).tipo !== 'branca')
    .map((aba) => ({
      id: aba.id,
      nome: aba.nome,
      mes: aba.mes,
      ano: aba.ano,
      extraRows: (aba.extraRows ?? []).map((row) => ({ ...row })),
    }))
}

function normalizeState(state: ConsumoPlanilhaClinicaState): ConsumoPlanilhaClinicaState {
  const finalizedAuditoriaRowIds =
    state.finalizedAuditoriaRowIds ?? [...state.finalizedRowIds]
  const finalizedMaterialRowIds = state.finalizedMaterialRowIds ?? []
  const abasExtras = normalizeAbas(state.abasExtras)
  const abaAtivaId =
    state.abaAtivaId &&
    (state.abaAtivaId === CONSUMO_ABA_PRINCIPAL_ID ||
      abasExtras.some((aba) => aba.id === state.abaAtivaId))
      ? state.abaAtivaId
      : CONSUMO_ABA_PRINCIPAL_ID
  return {
    finalizedRowIds: [...finalizedAuditoriaRowIds],
    finalizedAuditoriaRowIds: [...finalizedAuditoriaRowIds],
    finalizedMaterialRowIds: [...finalizedMaterialRowIds],
    extraRows: state.extraRows.map((row) => ({ ...row })),
    abasExtras,
    abaAtivaId,
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
      abasExtras: state.abasExtras ?? [],
      abaAtivaId: state.abaAtivaId ?? CONSUMO_ABA_PRINCIPAL_ID,
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
        let foundInAba = false
        current.abasExtras = (current.abasExtras ?? []).map((aba) => {
          const abaIndex = aba.extraRows.findIndex((item) => item.id === row.id)
          if (abaIndex < 0) return aba
          foundInAba = true
          const nextRows = [...aba.extraRows]
          nextRows[abaIndex] = row
          return { ...aba, extraRows: nextRows }
        })
        if (!foundInAba) {
          current.extraRows.push({ ...row })
        }
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
        current.abasExtras = (current.abasExtras ?? []).map((aba) => {
          const abaIndex = aba.extraRows.findIndex((item) => item.id === row.id)
          if (abaIndex < 0) return aba
          const nextRows = [...aba.extraRows]
          nextRows[abaIndex] = row
          return { ...aba, extraRows: nextRows }
        })
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
