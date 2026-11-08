/**
 * Regra PME / IMH clínica:
 * TITULAR / DEPENDENTE DIRETO / PENSIONISTA → 20%
 * DEPENDENTE INDIRETO → 100%
 * OUTRO / OUTROS (ou vazio) → null (edição manual do %)
 */
export function pctIndenizarFromVinculo(vinculo: string): string | null {
  const normalized = vinculo
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!normalized || normalized === 'OUTRO' || normalized === 'OUTROS') return null
  if (normalized.includes('INDIRETO')) return '100%'
  if (
    normalized === 'TITULAR' ||
    normalized === 'PENSIONISTA' ||
    normalized === 'DEPENDENTE' ||
    normalized.includes('DEPENDENTE DIRETO')
  ) {
    return '20%'
  }
  return null
}

/** % editável só quando o vínculo é OUTRO/OUTROS (ou ainda não escolhido). */
export function isPctIndenizarManualPorVinculo(vinculo: string): boolean {
  return pctIndenizarFromVinculo(vinculo) === null
}

/** Converte "20%", "20" ou "0,2" em fração 0–1. */
export function parsePctIndenizar(raw: string): number {
  const cleaned = raw.trim().replace('%', '').replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > 1) return n / 100
  if (n === 1) return 1
  return n
}
