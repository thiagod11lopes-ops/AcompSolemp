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
    finalizedDivMaterialIds: Array.isArray(state?.finalizedDivMaterialIds)
      ? state.finalizedDivMaterialIds.filter((id) => typeof id === 'string')
      : [],
    devolvidosDivMaterialIds: Array.isArray(state?.devolvidosDivMaterialIds)
      ? state.devolvidosDivMaterialIds.filter((id) => typeof id === 'string')
      : [],
    planilhaFiltros: normalizePlanilhaFiltrosPersistidos(state?.planilhaFiltros),
  }
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

export const clinicaPlanilhasLivresService = {
  getState(
    clinicaId: string,
    modo: PlanilhasModo = 'clinica',
  ): ClinicaPlanilhasLivresState {
    const data = loadAppData()
    const fromApp = normalizeState(data.planilhasLivres?.[clinicaId], modo)
    const fromBackupRaw = readPlanilhasLivresBackup(clinicaId)
    const fromBackup = fromBackupRaw ? normalizeState(fromBackupRaw, modo) : undefined
    const richer = pickRicherPlanilhasState(fromApp, fromBackup) ?? fromApp

    // AppData vazio após F5: restaura backup e empurra de volta ao servidor.
    if (
      planilhasLivresContentScore(fromBackup) > planilhasLivresContentScore(fromApp) &&
      fromBackup
    ) {
      if (!data.planilhasLivres) data.planilhasLivres = {}
      data.planilhasLivres[clinicaId] = fromBackup
      saveAppData(data)
      writePlanilhasLivresBackup(clinicaId, fromBackup)
      syncPlanilhasToServer()
      return fromBackup
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
    const baseline = pickRicherPlanilhasState(prev, fromBackup)
    const scoreNext = planilhasLivresContentScore(next)
    const scoreBase = planilhasLivresContentScore(baseline)

    // Race pós-F5: UI ainda vazia tenta persistir e apagaria import rico.
    // Apagar mês/linhas (score cai, mas > 0) continua permitido.
    let toSave = next
    if (!options?.allowEmptyOverwrite && scoreNext <= 0 && scoreBase > 0 && baseline) {
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
        },
        modo,
      )
    }

    data.planilhasLivres[clinicaId] = toSave
    if (modo === 'medicamento' && toSave.listaMedicamentos) {
      data.medicamentosPrecos = listaMedicamentosToPrecosRows(toSave.listaMedicamentos)
    }
    saveAppData(data)

    if (options?.allowEmptyOverwrite && planilhasLivresContentScore(toSave) <= 0) {
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
      }
      return toSave
    }

    writePlanilhasLivresBackup(clinicaId, toSave)
    if (planilhasLivresContentScore(toSave) > 0) {
      syncPlanilhasToServer()
    }
    return toSave
  },

  clearState(clinicaId: string): void {
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
   * Carrega a planilha da tabela SQL do servidor (fonte da verdade após F5).
   * Atualiza AppData + backup local se o remoto for mais completo.
   */
  async loadStateFromServer(
    clinicaId: string,
    modo: PlanilhasModo = 'clinica',
  ): Promise<ClinicaPlanilhasLivresState> {
    const local = this.getState(clinicaId, modo)
    if (!useCloudAppDataSync()) return local

    try {
      const { getTenantId } = await import('@/services/tenantService')
      // Após F5 o tenant pode atrasar alguns ms — tenta de novo antes de desistir.
      if (!getTenantId()) {
        await new Promise((r) => setTimeout(r, 200))
      }
      if (!getTenantId()) {
        await new Promise((r) => setTimeout(r, 500))
      }

      const { fetchPlanilhaLivresForClinica } = await import(
        '@/data/persistence/normalized/planilhasLivresSync'
      )
      const remoteRaw = await fetchPlanilhaLivresForClinica(clinicaId)
      if (!remoteRaw) return local
      const remote = normalizeState(remoteRaw, modo)
      const richer = pickRicherPlanilhasState(local, remote) ?? local
      if (planilhasLivresContentScore(richer) > planilhasLivresContentScore(local)) {
        const data = loadAppData()
        if (!data.planilhasLivres) data.planilhasLivres = {}
        data.planilhasLivres[clinicaId] = richer
        // silent: evita flush imediato com race; backup local já segura o F5.
        saveAppData(data)
        writePlanilhasLivresBackup(clinicaId, richer)
      } else if (planilhasLivresContentScore(richer) > 0) {
        writePlanilhasLivresBackup(clinicaId, richer)
      }
      return richer
    } catch (error) {
      console.warn('[AcompOPMS] loadStateFromServer falhou:', error)
      return local
    }
  },
}
