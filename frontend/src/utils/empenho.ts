/** Extrai o número bruto do empenho a partir de etiquetas ou campo livre. */
export function extractEmpenhoRaw(
  etiquetas?: string | null,
  empenhoCampo?: string | null,
): string | null {
  const direto = empenhoCampo?.trim()
  if (direto) return direto

  if (!etiquetas?.trim()) return null
  const parts = etiquetas
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)

  const comNe = parts.find(
    (p) => /^NE\b/i.test(p) || /\dNE\d/i.test(p) || /^NE\s*\(/i.test(p),
  )
  if (comNe) return comNe

  // Formato típico: ET | DANFE | EMPENHO | ATA
  if (parts.length >= 3) return parts[2]
  return null
}

/**
 * Formata o empenho como `NE (NÚMERO)`.
 * Aceita valores como `4451`, `NE 4451`, `2025NE4451`, `(4451)`.
 */
export function formatEmpenhoNe(empenho: string | null | undefined): string | null {
  const raw = empenho?.trim()
  if (!raw) return null

  let numero = raw
    .replace(/^NE\s*/i, '')
    .replace(/^\(+/, '')
    .replace(/\)+$/, '')
    .trim()

  if (!numero) return null
  return `NE (${numero})`
}

export function resolveEmpenhoExibicao(input: {
  etiquetas?: string | null
  empenho?: string | null
}): string | null {
  return formatEmpenhoNe(extractEmpenhoRaw(input.etiquetas, input.empenho))
}
