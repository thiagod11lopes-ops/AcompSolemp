import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, startOfYear, subMonths, subYears } from 'date-fns'

export type PeriodoPreset = 'mes' | 'trimestre' | 'ano' | '12m' | 'custom'

export function toDateInputValue(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function presetRange(preset: Exclude<PeriodoPreset, 'custom'>): {
  inicio: string
  fim: string
} {
  const now = new Date()
  const fim = endOfDay(now)
  if (preset === 'mes') {
    return { inicio: toDateInputValue(startOfMonth(now)), fim: toDateInputValue(fim) }
  }
  if (preset === 'trimestre') {
    return { inicio: toDateInputValue(startOfDay(subMonths(now, 2))), fim: toDateInputValue(fim) }
  }
  if (preset === 'ano') {
    return { inicio: toDateInputValue(startOfYear(now)), fim: toDateInputValue(fim) }
  }
  return { inicio: toDateInputValue(startOfDay(subYears(now, 1))), fim: toDateInputValue(fim) }
}

export function maxDataFimInput(): string {
  return toDateInputValue(endOfMonth(new Date()))
}
