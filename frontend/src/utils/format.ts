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
