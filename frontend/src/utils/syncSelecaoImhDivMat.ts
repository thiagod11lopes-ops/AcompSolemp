import type { ImhAbaLinha } from '@/types'
import type { DivMaterialLinha } from '@/utils/divMaterialForm'
import { formatNip } from '@/utils/format'

/** Origem compartilhada entre IMH (`imh-auto-<origem>`) e Div. Material (`sourceKey`). */
function linkKeyFromImhId(id: string): string | null {
  if (!id.startsWith('imh-auto-')) return null
  return id.slice('imh-auto-'.length)
}

function linkKeyFromDivLinha(linha: DivMaterialLinha): string | null {
  const sourceKey = linha.sourceKey?.trim() ?? ''
  if (sourceKey) {
    const origem = sourceKey.slice(sourceKey.lastIndexOf('|') + 1)
    if (
      origem.startsWith('conmed-pac:') ||
      origem.startsWith('conmed-mat:') ||
      origem.startsWith('consumo:')
    ) {
      return origem
    }
  }
  if (linha.id.startsWith('div-mat-consumo-')) {
    return `consumo:${linha.id.slice('div-mat-consumo-'.length)}`
  }
  return null
}

function softKey(nip: string, data: string): string | null {
  const n = formatNip(nip.trim()) || nip.trim()
  const d = data.trim()
  if (!n && !d) return null
  return `${n}|${d}`
}

function buildLinkMaps(imhLinhas: ImhAbaLinha[], divLinhas: DivMaterialLinha[]) {
  const imhByLink = new Map<string, string>()
  const divByLink = new Map<string, string>()
  const imhBySoft = new Map<string, string[]>()
  const divBySoft = new Map<string, string[]>()

  for (const linha of imhLinhas) {
    const link = linkKeyFromImhId(linha.id)
    if (link) imhByLink.set(link, linha.id)
    const soft = softKey(linha.nip, linha.data)
    if (soft) {
      const list = imhBySoft.get(soft) ?? []
      list.push(linha.id)
      imhBySoft.set(soft, list)
    }
  }

  for (const linha of divLinhas) {
    const link = linkKeyFromDivLinha(linha)
    if (link) divByLink.set(link, linha.id)
    const soft = softKey(linha.nip, linha.dataProcedimento)
    if (soft) {
      const list = divBySoft.get(soft) ?? []
      list.push(linha.id)
      divBySoft.set(soft, list)
    }
  }

  return { imhByLink, divByLink, imhBySoft, divBySoft }
}

function correspondingDivIds(
  imhId: string,
  imhLinhas: ImhAbaLinha[],
  maps: ReturnType<typeof buildLinkMaps>,
): string[] {
  const link = linkKeyFromImhId(imhId)
  if (link) {
    const divId = maps.divByLink.get(link)
    return divId ? [divId] : []
  }
  const imhLinha = imhLinhas.find((l) => l.id === imhId)
  if (!imhLinha) return []
  const soft = softKey(imhLinha.nip, imhLinha.data)
  if (!soft) return []
  return maps.divBySoft.get(soft) ?? []
}

function correspondingImhIds(
  divId: string,
  divLinhas: DivMaterialLinha[],
  maps: ReturnType<typeof buildLinkMaps>,
): string[] {
  const divLinha = divLinhas.find((l) => l.id === divId)
  if (!divLinha) return []
  const link = linkKeyFromDivLinha(divLinha)
  if (link) {
    const imhId = maps.imhByLink.get(link)
    return imhId ? [imhId] : []
  }
  const soft = softKey(divLinha.nip, divLinha.dataProcedimento)
  if (!soft) return []
  return maps.imhBySoft.get(soft) ?? []
}

/**
 * Espelha a seleção da IMH nas linhas correspondentes da Div. Material.
 * Mantém seleções Div sem correspondente na IMH.
 */
export function syncSelecaoDivFromImh(
  selectedImhIds: Set<string>,
  imhLinhas: ImhAbaLinha[],
  divLinhas: DivMaterialLinha[],
  prevSelectedDivIds: Set<string>,
): Set<string> {
  const maps = buildLinkMaps(imhLinhas, divLinhas)
  const linkedDivIds = new Set<string>()
  for (const divId of maps.divByLink.values()) linkedDivIds.add(divId)
  for (const ids of maps.divBySoft.values()) {
    for (const id of ids) linkedDivIds.add(id)
  }

  const next = new Set<string>()
  for (const id of prevSelectedDivIds) {
    if (!linkedDivIds.has(id)) next.add(id)
  }
  for (const imhId of selectedImhIds) {
    for (const divId of correspondingDivIds(imhId, imhLinhas, maps)) {
      next.add(divId)
    }
  }
  return next
}

/**
 * Espelha a seleção da Div. Material nas linhas correspondentes da IMH.
 * Mantém seleções IMH sem correspondente na Div. Material.
 */
export function syncSelecaoImhFromDiv(
  selectedDivIds: Set<string>,
  imhLinhas: ImhAbaLinha[],
  divLinhas: DivMaterialLinha[],
  prevSelectedImhIds: Set<string>,
): Set<string> {
  const maps = buildLinkMaps(imhLinhas, divLinhas)
  const linkedImhIds = new Set<string>()
  for (const imhId of maps.imhByLink.values()) linkedImhIds.add(imhId)
  for (const ids of maps.imhBySoft.values()) {
    for (const id of ids) linkedImhIds.add(id)
  }

  const next = new Set<string>()
  for (const id of prevSelectedImhIds) {
    if (!linkedImhIds.has(id)) next.add(id)
  }
  for (const divId of selectedDivIds) {
    for (const imhId of correspondingImhIds(divId, divLinhas, maps)) {
      next.add(imhId)
    }
  }
  return next
}
