import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date
  return format(parsed, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(date: string | Date): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date
  return format(parsed, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatRelative(date: string): string {
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: ptBR })
}

export function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '')
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }
  return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
}

/** Formato NIP: 00.0000.00 (8 dígitos) */
export const NIP_REGEX = /^\d{2}\.\d{4}\.\d{2}$/

export function maskNip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 6)}.${digits.slice(6)}`
}

export function formatNip(value: string): string {
  if (!value) return value
  if (NIP_REGEX.test(value)) return value
  return maskNip(value)
}

/** Nome próprio: letras (com acento), espaços, hífen e apóstrofo — sem números */
export const NOME_PROPRIO_REGEX = /^[A-Za-zÀ-ÿ]+(?:[ '\-][A-Za-zÀ-ÿ]+)*$/

export function maskNomeProprio(value: string): string {
  return value
    .replace(/\d/g, '')
    .replace(/[^A-Za-zÀ-ÿ '\-]/g, '')
    .replace(/[ '\-]{2,}/g, (m) => m[0])
    .replace(/^\s+/, '')
}

export function validateNomeProprio(value: string): string | null {
  const nome = value.trim()
  if (nome.length < 2) return 'Informe o nome de quem assinou'
  if (/\d/.test(nome)) return 'O nome não pode conter números'
  if (!NOME_PROPRIO_REGEX.test(nome)) {
    return 'Informe um nome próprio válido (apenas letras)'
  }
  return null
}
