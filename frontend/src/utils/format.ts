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

/** Formato de número SOLEMP — não deve ser usado como nome do assinante */
const SOLEMP_NUMERO_COMO_NOME = /^\d{5}-\d{4}\/\d{4}$/

/** Nome do assinante em formato livre (texto), sem ser o número da SOLEMP */
export function validateNomeAssinante(value: string): string | null {
  const nome = value.trim()
  if (nome.length < 2) return 'Informe o nome de quem assinou'
  if (SOLEMP_NUMERO_COMO_NOME.test(nome)) {
    return 'Informe o nome da pessoa, não o número da SOLEMP (ex.: 65720-2636/2025)'
  }
  // Evita colar só o padrão numérico da SOLEMP com espaços extras
  if (/^\d{5}\s*-\s*\d{4}\s*\/\s*\d{4}$/.test(nome)) {
    return 'Informe o nome da pessoa, não o número da SOLEMP'
  }
  return null
}
