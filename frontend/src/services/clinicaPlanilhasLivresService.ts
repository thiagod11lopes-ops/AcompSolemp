import { loadAppData, saveAppData } from '@/mocks/seed'
import { useCloudAppDataSync } from '@/config/dataSource'
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
import { normalizePlanilhaFiltrosPersistidos } from '@/utils/planilhaDataFiltro'
import {
  clonePacientesPmeSeed,
  normalizePacientesPmeRows,
} from '@/utils/pacientesPme'
import {
  pickRicherPlanilhasState,
  planilhasLivresContentScore,
  readPlanilhasLivresBackup,
  writePlanilhasLivresBackup,
  clearPlanilhasLivresBackup,
} from '@/utils/planilhasLivresBackup'

export { resolveAbaSheet } from '@/utils/planilhasFixas'

/**
 * Cache de sessão: sobrevive a remount/troca de aba na mesma sessão.
 * Só some com clearState / allowEmptyOverwrite (exclusão manual).
 */
const stickyPlanilhasByClinica = new Map<string, ClinicaPlanilhasLivresState>()

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
  const pacientesFromState = normalizePacientesPmeRows(state?.pacientesPme)
  const pacientesPme =
    state?.pacientesPme !== undefined
      ? pacientesFromState
      : modo === 'medicamento'
        ? clonePacientesPmeSeed()
        : pacientesFromState
  return {
    abas,
    abaAtivaId,
    conmedComrj: normalizeConmedComrjForm(state?.conmedComrj),
    imh: normalizeImhAbaForm(state?.imh),
    imhMedicamento: normalizeImhMedicamentoForm(state?.imhMedicamento),
    listaMedicamentos,
    pacientesPme,
    listaMateriais: normalizeListaMateriaisForm(state?.listaMateriais),
    consumoMaterialConsignado: normalizeConsumoMaterialRows(state?.consumoMaterialConsignado),
    divMaterialLinhas: Array.isArray(state?.divMaterialLinhas)
      ? state.divMaterialLinhas.filter(
          (l) => l && typeof l === 'object' && typeof (l as { id?: unknown }).id === 'string',
        )
      : [],
    finalizedDivMaterialIds: Array.isArray(state?.finalizedDivMaterialIds)
      ? state.finalizedDivMaterialIds.filter((id) => typeof id === 'string')
      : [],
    devolvidosDivMaterialIds: Array.isArray(state?.devolvidosDivMaterialIds)
      ? state.devolvidosDivMaterialIds.filter((id) => typeof id === 'string')
      : [],
    planilhaFiltros: normalizePlanilhaFiltrosPersistidos(state?.planilhaFiltros),
  }
}

function rememberSticky(
  clinicaId: string,
  state: ClinicaPlanilhasLivresState,
): ClinicaPlanilhasLivresState {
  if (planilhasLivresContentScore(state) <= 0) return state
  const prev = stickyPlanilhasByClinica.get(clinicaId)
  const richer = pickRicherPlanilhasState(prev, state) ?? state
  stickyPlanilhasByClinica.set(clinicaId, richer)
  return richer
}

/** Garante app_state + tabela planilhas_livres no servidor. */
function syncPlanilhasToServer(): void {
  if (!useCloudAppDataSync()) return
  void (async () => {
    try {
      const { flushSupabaseAppDataSync } = await import('@/data/persistence/supabaseSync')
      await flushSupabaseAppDataSync()
    } catch (error) {
      console.warn('[AcompOPMS] Falha ao sincronizar planilhas com o servidor:', error)
    }
  })()
}

function injectIntoAppData(clinicaId: string, state: ClinicaPlanilhasLivresState): void {
  const data = loadAppData()
  if (!data.planilhasLivres) data.planilhasLivres = {}
  const prev = data.planilhasLivres[clinicaId]
  const richer = pickRicherPlanilhasState(prev, state) ?? state
  if (planilhasLivresContentScore(richer) <= planilhasLivresContentScore(prev)) return
  data.planilhasLivres[clinicaId] = richer
  saveAppData(data)
}

export const clinicaPlanilhasLivresService = {
  getState(
    clinicaId: string,
    modo: PlanilhasModo = 'clinica',
  ): ClinicaPlanilhasLivresState {
    const data = loadAppData()
    const fromApp = normalizeState(data.planilhasLivres?.[clinicaId], modo)
    const fromBackupRaw = readPlanilhasLivresBackup(clinicaId)
    const fromBackup = fromBackupRaw ? normalizeState(fromBackupRaw, modo) : undefined
    const fromStickyRaw = stickyPlanilhasByClinica.get(clinicaId)
    const fromSticky = fromStickyRaw ? normalizeState(fromStickyRaw, modo) : undefined

    const richer =
      pickRicherPlanilhasState(
        pickRicherPlanilhasState(fromApp, fromBackup),
        fromSticky,
      ) ?? fromApp

    if (planilhasLivresContentScore(richer) > 0) {
      stickyPlanilhasByClinica.set(clinicaId, richer)
      writePlanilhasLivresBackup(clinicaId, richer)
      // Reinjeta no AppData se o blob/cache estiver oco (após F5).
      if (planilhasLivresContentScore(fromApp) < planilhasLivresContentScore(richer)) {
        injectIntoAppData(clinicaId, richer)
        syncPlanilhasToServer()
      }
    }

    return richer
  },

  saveState(
    clinicaId: string,
    state: ClinicaPlanilhasLivresState,
    modo: PlanilhasModo = 'clinica',
    options?: { allowEmptyOverwrite?: boolean },
  ): ClinicaPlanilhasLivresState {
    const data = loadAppData()
    if (!data.planilhasLivres) data.planilhasLivres = {}
    const next = normalizeState(state, modo)
    const prev = data.planilhasLivres[clinicaId]
    const fromBackup = readPlanilhasLivresBackup(clinicaId)
    const fromSticky = stickyPlanilhasByClinica.get(clinicaId)
    const baseline =
      pickRicherPlanilhasState(pickRicherPlanilhasState(prev, fromBackup), fromSticky) ??
      prev
    const scoreNext = planilhasLivresContentScore(next)
    const scoreBase = planilhasLivresContentScore(baseline)

    // Exclusão manual: zera sticky + backup + SQL.
    if (options?.allowEmptyOverwrite && scoreNext <= 0) {
      stickyPlanilhasByClinica.delete(clinicaId)
      clearPlanilhasLivresBackup(clinicaId)
      data.planilhasLivres[clinicaId] = next
      saveAppData(data)
      if (useCloudAppDataSync()) {
        void (async () => {
          try {
            const { deletePlanilhaLivresForClinica } = await import(
              '@/data/persistence/normalized/planilhasLivresSync'
            )
            await deletePlanilhaLivresForClinica(clinicaId)
            const { flushSupabaseAppDataSync } = await import('@/data/persistence/supabaseSync')
            await flushSupabaseAppDataSync()
          } catch (error) {
            console.warn('[AcompOPMS] Falha ao limpar planilha no servidor:', error)
          }
        })()
      }
      return next
    }

    // Nunca grava vazio por cima de import rico (F5 / troca de aba / autofill).
    if (scoreNext <= 0 && scoreBase > 0 && baseline) {
      return rememberSticky(clinicaId, normalizeState(baseline, modo))
    }
    if (scoreNext <= 0) {
      return next
    }

    // Mescla metadados da UI com o conteúdo mais rico (não perde IMH/DM).
    let toSave = next
    if (scoreNext < scoreBase && baseline) {
      const nextImhLen = next.imh?.linhas?.length ?? 0
      const baseImhLen = baseline.imh?.linhas?.length ?? 0
      const nextDivLen = next.divMaterialLinhas?.length ?? 0
      const baseDivLen = baseline.divMaterialLinhas?.length ?? 0
      const nextConmed = next.conmedComrj?.pacientes?.length ?? 0
      const baseConmed = baseline.conmedComrj?.pacientes?.length ?? 0
      // Só aceita redução se ainda houver conteúdo e o usuário de fato editou
      // (pelo menos um domínio continua com linhas). Caso contrário mantém baseline.
      const intentionalReduce =
        (nextImhLen > 0 || nextDivLen > 0 || nextConmed > 0) &&
        (nextImhLen < baseImhLen || nextDivLen < baseDivLen || nextConmed < baseConmed)
      if (!intentionalReduce) {
        toSave = normalizeState(
          {
            ...baseline,
            abaAtivaId: next.abaAtivaId ?? baseline.abaAtivaId,
            abas: next.abas?.length ? next.abas : baseline.abas,
            planilhaFiltros: next.planilhaFiltros ?? baseline.planilhaFiltros,
            finalizedDivMaterialIds:
              next.finalizedDivMaterialIds ?? baseline.finalizedDivMaterialIds,
            devolvidosDivMaterialIds:
              next.devolvidosDivMaterialIds ?? baseline.devolvidosDivMaterialIds,
            imh: nextImhLen >= baseImhLen ? next.imh : baseline.imh,
            conmedComrj: nextConmed >= baseConmed ? next.conmedComrj : baseline.conmedComrj,
            divMaterialLinhas:
              nextDivLen >= baseDivLen ? next.divMaterialLinhas : baseline.divMaterialLinhas,
          },
          modo,
        )
      }
    }

    data.planilhasLivres[clinicaId] = toSave
    if (modo === 'medicamento' && toSave.listaMedicamentos) {
      data.medicamentosPrecos = listaMedicamentosToPrecosRows(toSave.listaMedicamentos)
    }
    saveAppData(data)
    writePlanilhasLivresBackup(clinicaId, toSave)
    rememberSticky(clinicaId, toSave)
    syncPlanilhasToServer()
    return toSave
  },

  clearState(clinicaId: string): void {
    stickyPlanilhasByClinica.delete(clinicaId)
    const data = loadAppData()
    if (!data.planilhasLivres?.[clinicaId]) {
      clearPlanilhasLivresBackup(clinicaId)
      return
    }
    delete data.planilhasLivres[clinicaId]
    saveAppData(data)
    clearPlanilhasLivresBackup(clinicaId)
    if (useCloudAppDataSync()) {
      void (async () => {
        try {
          const { deletePlanilhaLivresForClinica } = await import(
            '@/data/persistence/normalized/planilhasLivresSync'
          )
          await deletePlanilhaLivresForClinica(clinicaId)
          const { flushSupabaseAppDataSync } = await import('@/data/persistence/supabaseSync')
          await flushSupabaseAppDataSync()
        } catch (error) {
          console.warn('[AcompOPMS] Falha ao limpar planilha no servidor:', error)
        }
      })()
    } else {
      syncPlanilhasToServer()
    }
  },

  /**
   * Carrega a planilha da tabela SQL (fonte durável após F5).
   * Atualiza sticky + AppData + backup; nunca substitui rico por vazio.
   */
  async loadStateFromServer(
    clinicaId: string,
    modo: PlanilhasModo = 'clinica',
  ): Promise<ClinicaPlanilhasLivresState> {
    const local = this.getState(clinicaId, modo)
    if (!useCloudAppDataSync()) return local

    try {
      const { getTenantId } = await import('@/services/tenantService')
      for (const wait of [0, 200, 500, 1000]) {
        if (wait) await new Promise((r) => setTimeout(r, wait))
        if (getTenantId()) break
      }

      const { fetchPlanilhaLivresForClinica } = await import(
        '@/data/persistence/normalized/planilhasLivresSync'
      )
      const remoteRaw = await fetchPlanilhaLivresForClinica(clinicaId)
      if (!remoteRaw) return local
      const remote = normalizeState(remoteRaw, modo)
      const richer = pickRicherPlanilhasState(local, remote) ?? local
      if (planilhasLivresContentScore(richer) > 0) {
        rememberSticky(clinicaId, richer)
        writePlanilhasLivresBackup(clinicaId, richer)
        if (planilhasLivresContentScore(richer) > planilhasLivresContentScore(local)) {
          injectIntoAppData(clinicaId, richer)
        }
      }
      return richer
    } catch (error) {
      console.warn('[AcompOPMS] loadStateFromServer falhou:', error)
      return local
    }
  },
}
