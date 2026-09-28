import type { ConmedComrjFormData, ImhAbaFormData } from '@/types'
import type { DivMaterialLinha } from '@/utils/divMaterialForm'
import { formatNip } from '@/utils/format'

function nipKey(nip: string): string {
  const trimmed = nip.trim()
  return formatNip(trimmed) || trimmed
}

function conmedPatientIdFromImhLinhaId(
  id: string,
  conmed: ConmedComrjFormData,
): string | null {
  if (id.startsWith('imh-auto-conmed-pac:')) {
    return id.slice('imh-auto-conmed-pac:'.length)
  }
  if (id.startsWith('imh-auto-conmed-mat:')) {
    const matId = id.slice('imh-auto-conmed-mat:'.length)
    for (const paciente of conmed.pacientes) {
      if (paciente.materiais.some((mat) => mat.id === matId)) return paciente.id
    }
  }
  return null
}

function conmedPatientIdFromDivLinhaId(
  id: string,
  conmed: ConmedComrjFormData,
): string | null {
  if (!id.startsWith('div-mat-conmed-')) return null
  const ref = id.slice('div-mat-conmed-'.length)
  if (conmed.pacientes.some((paciente) => paciente.id === ref)) return ref
  for (const paciente of conmed.pacientes) {
    if (paciente.materiais.some((mat) => mat.id === ref)) return paciente.id
  }
  return null
}

function applyNomeNoConmed(
  conmed: ConmedComrjFormData,
  nome: string,
  opts: { patientId?: string | null; nip?: string },
): { conmed: ConmedComrjFormData; changed: boolean } {
  const nip = opts.nip ? nipKey(opts.nip) : ''
  let changed = false
  const pacientes = conmed.pacientes.map((paciente) => {
    const sameId = Boolean(opts.patientId && paciente.id === opts.patientId)
    const sameNip = Boolean(nip && nipKey(paciente.nip) === nip)
    if (!sameId && !sameNip) return paciente
    if (paciente.iniciais === nome) return paciente
    changed = true
    return { ...paciente, iniciais: nome }
  })
  return changed ? { conmed: { ...conmed, pacientes }, changed } : { conmed, changed: false }
}

function applyNomePacienteNasDivLinhas(
  linhas: DivMaterialLinha[],
  nome: string,
  opts: { patientId?: string | null; nip?: string; conmed: ConmedComrjFormData },
): { linhas: DivMaterialLinha[]; changed: boolean } {
  const nip = opts.nip ? nipKey(opts.nip) : ''
  let changed = false
  const next = linhas.map((linha) => {
    const sameNip = Boolean(nip && nipKey(linha.nip) === nip)
    const linhaPatientId = conmedPatientIdFromDivLinhaId(linha.id, opts.conmed)
    const samePatient = Boolean(
      opts.patientId && linhaPatientId && opts.patientId === linhaPatientId,
    )
    if (!sameNip && !samePatient) return linha
    if (linha.nomePaciente === nome) return linha
    changed = true
    return { ...linha, nomePaciente: nome }
  })
  return { linhas: next, changed }
}

function applyNomeUsuarioNasImhLinhas(
  imh: ImhAbaFormData,
  nome: string,
  opts: { patientId?: string | null; nip?: string; conmed: ConmedComrjFormData },
): { imh: ImhAbaFormData; changed: boolean } {
  const nip = opts.nip ? nipKey(opts.nip) : ''
  let changed = false
  const linhas = imh.linhas.map((linha) => {
    const sameNip = Boolean(nip && nipKey(linha.nip) === nip)
    const linhaPatientId = conmedPatientIdFromImhLinhaId(linha.id, opts.conmed)
    const samePatient = Boolean(
      opts.patientId && linhaPatientId && opts.patientId === linhaPatientId,
    )
    if (!sameNip && !samePatient) return linha
    if (linha.nomeUsuario === nome) return linha
    changed = true
    return { ...linha, nomeUsuario: nome }
  })
  return changed ? { imh: { ...imh, linhas }, changed } : { imh, changed: false }
}

/**
 * Quando o NOME DO USUÁRIO muda na IMH, espelha na Div. Material (e no CONMED)
 * e nas demais linhas IMH do mesmo paciente/NIP.
 */
export function syncNomesFromImhChange(
  prevImh: ImhAbaFormData,
  nextImh: ImhAbaFormData,
  divLinhas: DivMaterialLinha[],
  conmed: ConmedComrjFormData,
): {
  imh: ImhAbaFormData
  divLinhas: DivMaterialLinha[]
  conmed: ConmedComrjFormData
  changed: boolean
} {
  const prevById = new Map(prevImh.linhas.map((l) => [l.id, l]))
  let nextForm = nextImh
  let nextDiv = divLinhas
  let nextConmed = conmed
  let changed = false

  for (const linha of nextImh.linhas) {
    const prev = prevById.get(linha.id)
    const nome = linha.nomeUsuario
    if (prev && prev.nomeUsuario === nome) continue
    if (!prev && !nome.trim()) continue

    const patientId = conmedPatientIdFromImhLinhaId(linha.id, nextConmed)
    const nip = linha.nip

    const conmedResult = applyNomeNoConmed(nextConmed, nome, { patientId, nip })
    nextConmed = conmedResult.conmed
    changed = changed || conmedResult.changed

    const imhResult = applyNomeUsuarioNasImhLinhas(nextForm, nome, {
      patientId,
      nip,
      conmed: nextConmed,
    })
    nextForm = imhResult.imh
    changed = changed || imhResult.changed

    const divResult = applyNomePacienteNasDivLinhas(nextDiv, nome, {
      patientId,
      nip,
      conmed: nextConmed,
    })
    nextDiv = divResult.linhas
    changed = changed || divResult.changed
  }

  return { imh: nextForm, divLinhas: nextDiv, conmed: nextConmed, changed }
}

/**
 * Quando o Nome do paciente muda na Div. Material, espelha na IMH (e no CONMED)
 * e nas demais linhas Div. Material do mesmo paciente/NIP.
 */
export function syncNomesFromDivChange(
  prevDiv: DivMaterialLinha[],
  nextDiv: DivMaterialLinha[],
  imh: ImhAbaFormData,
  conmed: ConmedComrjFormData,
): {
  imh: ImhAbaFormData
  divLinhas: DivMaterialLinha[]
  conmed: ConmedComrjFormData
  changed: boolean
} {
  const prevById = new Map(prevDiv.map((l) => [l.id, l]))
  let nextImh = imh
  let nextLinhas = nextDiv
  let nextConmed = conmed
  let changed = false

  for (const linha of nextDiv) {
    const prev = prevById.get(linha.id)
    const nome = linha.nomePaciente
    if (prev && prev.nomePaciente === nome) continue
    if (!prev && !nome.trim()) continue

    const patientId = conmedPatientIdFromDivLinhaId(linha.id, nextConmed)
    const nip = linha.nip

    const conmedResult = applyNomeNoConmed(nextConmed, nome, { patientId, nip })
    nextConmed = conmedResult.conmed
    changed = changed || conmedResult.changed

    const imhResult = applyNomeUsuarioNasImhLinhas(nextImh, nome, {
      patientId,
      nip,
      conmed: nextConmed,
    })
    nextImh = imhResult.imh
    changed = changed || imhResult.changed

    const divResult = applyNomePacienteNasDivLinhas(nextLinhas, nome, {
      patientId,
      nip,
      conmed: nextConmed,
    })
    nextLinhas = divResult.linhas
    changed = changed || divResult.changed
  }

  return { imh: nextImh, divLinhas: nextLinhas, conmed: nextConmed, changed }
}
