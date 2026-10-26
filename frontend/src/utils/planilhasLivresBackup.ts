import type { ClinicaPlanilhasLivresState } from '@/types'

const LS_PREFIX = 'acompopms:planilhas-livres:'

/** Pontuação de conteúdo útil (import CONMED/IMH etc.). */
export function planilhasLivresContentScore(
  state?: ClinicaPlanilhasLivresState | null,
): number {
  if (!state) return 0
  const conmedPac = state.conmedComrj?.pacientes?.length ?? 0
  const conmedMats = (state.conmedComrj?.pacientes ?? []).reduce(
    (n, p) => n + (p.materiais?.length ?? 0),
    0,
  )
  const imh = state.imh?.linhas?.length ?? 0
  const imhMed = state.imhMedicamento?.linhas?.length ?? 0
  const consumo = state.consumoMaterialConsignado?.length ?? 0
  const listaMed = state.listaMedicamentos?.linhas?.length ?? 0
  const listaMat = state.listaMateriais?.linhas?.length ?? 0
  const pacientesPme = state.pacientesPme?.length ?? 0
  const cabecalho = [
    state.conmedComrj?.numero,
    state.conmedComrj?.processo,
    state.conmedComrj?.fornecedor,
  ].filter((v) => typeof v === 'string' && v.trim()).length
  return (
    conmedPac * 10 +
    conmedMats * 3 +
    imh * 3 +
    imhMed * 3 +
    consumo * 2 +
    listaMed +
    listaMat +
    pacientesPme +
    cabecalho
  )
}

/** Backup local que sobrevive ao F5 (init cloud apaga APP_DATA do IndexedDB). */
export function writePlanilhasLivresBackup(
  clinicaId: string,
  state: ClinicaPlanilhasLivresState,
): void {
  if (!clinicaId) return
  try {
    localStorage.setItem(`${LS_PREFIX}${clinicaId}`, JSON.stringify(state))
  } catch (error) {
    console.warn('[AcompOPMS] Falha ao gravar backup local da planilha:', error)
  }
}

export function readPlanilhasLivresBackup(
  clinicaId: string,
): ClinicaPlanilhasLivresState | null {
  if (!clinicaId) return null
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${clinicaId}`)
    if (!raw) return null
    return JSON.parse(raw) as ClinicaPlanilhasLivresState
  } catch {
    return null
  }
}

export function clearPlanilhasLivresBackup(clinicaId: string): void {
  if (!clinicaId) return
  try {
    localStorage.removeItem(`${LS_PREFIX}${clinicaId}`)
  } catch {
    /* ignore */
  }
}

/** Escolhe o estado com mais conteúdo entre nuvem/memória e backup local. */
export function pickRicherPlanilhasState(
  a?: ClinicaPlanilhasLivresState | null,
  b?: ClinicaPlanilhasLivresState | null,
): ClinicaPlanilhasLivresState | undefined {
  const scoreA = planilhasLivresContentScore(a)
  const scoreB = planilhasLivresContentScore(b)
  if (scoreA === 0 && scoreB === 0) return a ?? b ?? undefined
  return scoreB > scoreA ? (b ?? undefined) : (a ?? undefined)
}
