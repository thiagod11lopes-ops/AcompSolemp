/**
 * Quebra o texto em linhas de até `maxChars` caracteres, preferindo limites
 * gramaticais (espaço entre palavras; não corta no meio da palavra).
 * Palavras isoladas maiores que o limite ficam em linha própria.
 */
export function wrapTextGramatical(text: string, maxChars = 50): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return text

  const words = normalized.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (!word) continue
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }
    if (current) {
      lines.push(current)
      current = word
      continue
    }
    // Palavra maior que o limite: não fragmenta (regra gramatical)
    lines.push(word)
    current = ''
  }

  if (current) lines.push(current)
  return lines.join('\n')
}

/** Maior linha após quebra gramatical (para medir largura da coluna). */
export function longestWrappedLine(text: string, maxChars = 50): string {
  const wrapped = wrapTextGramatical(text, maxChars)
  return wrapped.split('\n').reduce((best, line) => (line.length > best.length ? line : best), '')
}
