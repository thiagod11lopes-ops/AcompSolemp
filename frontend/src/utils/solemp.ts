import type { AppData } from '@/types'

/** Formato: 65720-2636/2025 */
export const SOLEMP_NUMERO_REGEX = /^\d{5}-\d{4}\/\d{4}$/

export interface SolempNumeroParts {
  prefix: string
  sequencial: string
  ano: string
}

export function parseSolempNumero(numero: string): SolempNumeroParts | null {
  const match = numero.match(/^(\d{5})-(\d{4})\/(\d{4})$/)
  if (!match) return null
  return { prefix: match[1], sequencial: match[2], ano: match[3] }
}

export function formatSolempNumero(parts: SolempNumeroParts): string {
  return `${parts.prefix}-${parts.sequencial}/${parts.ano}`
}

export function getSolempDefaults(data: AppData, clinicaId: string): SolempNumeroParts {
  const pedidoIds = data.pedidos.filter((p) => p.clinicaId === clinicaId).map((p) => p.id)
  const solempClinica = data.solemp.filter((s) => pedidoIds.includes(s.pedidoId))
  const ultima = solempClinica[solempClinica.length - 1] ?? data.solemp[data.solemp.length - 1]
  const ano = String(new Date().getFullYear())

  if (ultima) {
    const parsed = parseSolempNumero(ultima.numero)
    if (parsed) {
      return { prefix: parsed.prefix, sequencial: '', ano }
    }
  }

  return { prefix: '65720', sequencial: '', ano }
}

export function formatSolempPreview(parts: SolempNumeroParts): string {
  const seq = parts.sequencial.padEnd(4, '·').slice(0, 4)
  const ano = parts.ano || String(new Date().getFullYear())
  return `${parts.prefix}-${seq}/${ano}`
}

export function validateSolempNumero(numero: string): string | null {
  if (!SOLEMP_NUMERO_REGEX.test(numero)) {
    return 'Use o formato 65720-2636/2025'
  }
  return null
}
