import type { ConmedComrjFormData } from '@/types'

export const EMPTY_CONMED_COMRJ_FORM: ConmedComrjFormData = {
  numero: '',
  data: '',
  processo: '',
  pregaoTad: '',
  vigencia: '',
  fornecedor: '',
}

export function normalizeConmedComrjForm(
  value: ConmedComrjFormData | undefined,
): ConmedComrjFormData {
  return {
    numero: value?.numero ?? '',
    data: value?.data ?? '',
    processo: value?.processo ?? '',
    pregaoTad: value?.pregaoTad ?? '',
    vigencia: value?.vigencia ?? '',
    fornecedor: value?.fornecedor ?? '',
  }
}

/** Aceita/digita Nº no formato 25/2026 */
export function formatConmedNumero(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6)
  if (!digits) return ''
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2, 6)}`
}

/** Formata para dd/mm/aaaa enquanto digita */
export function formatConmedData(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** Mantém apenas dígitos no processo */
export function formatConmedProcesso(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** Pregão/TAD no espírito 58/2025 COMRJ — permite dígitos, barra e texto */
export function formatConmedPregaoTad(raw: string): string {
  return raw.replace(/\s+/g, ' ').slice(0, 40)
}
