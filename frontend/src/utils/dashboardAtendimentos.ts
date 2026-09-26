import type { AppData, PedidoPlanilhaEnvioState } from '@/types'
import type { DivMaterialLinha } from '@/utils/divMaterialForm'
import { normalizePacienteNipKey } from '@/utils/pacientesPme'

/** NIP válido para contagem de pessoas (mesma regra do total indenizado). */
function nipContabilizavel(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim() ?? ''
  if (!trimmed || trimmed === '—' || trimmed === '-') return null
  const key = normalizePacienteNipKey(trimmed)
  return key.length >= 4 ? key : null
}

/** Coleta NIPs únicos de uma planilha IMH (aba, medicamento ou legado). */
export function nipsUnicosPlanilhaImh(planilha: PedidoPlanilhaEnvioState): Set<string> {
  const nips = new Set<string>()
  const add = (raw?: string | null) => {
    const key = nipContabilizavel(raw)
    if (key) nips.add(key)
  }

  for (const linha of planilha.imhAbaLinhas ?? []) {
    add(linha.nip)
  }
  for (const linha of planilha.imhMedicamentoLinhas ?? []) {
    add(linha.nip)
  }
  for (const linha of planilha.linhas ?? []) {
    // No modelo legado, NIP fica na linha do paciente; materiais podem repetir o NIP.
    if (linha.isLinhaPaciente || linha.nip?.trim()) {
      add(linha.nip)
    }
  }

  return nips
}

/**
 * Pessoas atendidas: NIPs únicos por planilha IMH, somados entre planilhas.
 * O mesmo NIP em outra planilha conta de novo.
 */
export function contarPessoasAtendidas(data: AppData): number {
  let total = 0
  for (const planilha of Object.values(data.pedidoPlanilhaEnvio ?? {})) {
    const nips = nipsUnicosPlanilhaImh(planilha)
    if (nips.size === 0) continue
    total += nips.size
  }
  return total
}

function linhaDivMaterialContabilizavel(linha: DivMaterialLinha): boolean {
  return Boolean(
    linha.nip?.trim() ||
      linha.nomePaciente?.trim() ||
      linha.descricaoMaterial?.trim() ||
      linha.dataProcedimento?.trim() ||
      linha.valorTotal?.trim(),
  )
}

/** Procedimentos: todas as linhas preenchidas das planilhas Div. Material. */
export function contarProcedimentosDivMaterial(data: AppData): number {
  let total = 0
  for (const planilha of Object.values(data.pedidoPlanilhaEnvio ?? {})) {
    for (const linha of planilha.divMaterialLinhas ?? []) {
      if (linhaDivMaterialContabilizavel(linha)) total += 1
    }
  }
  return total
}
