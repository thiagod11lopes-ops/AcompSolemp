import type { ConmedComrjFormData, ConmedComrjMaterialItem } from '@/types'
import {
  formatValorBrasileiro,
  parseValorBrasileiro,
} from '@/utils/consumoMaterialOds'

export function createEmptyConmedMaterialItem(): ConmedComrjMaterialItem {
  return {
    id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mapaDaSala: '',
    danfe: '',
    item: '',
    nebPi: '',
    descricao: '',
    qt: '',
    valorUnit: '',
    valorTotal: '',
  }
}

export const EMPTY_CONMED_COMRJ_FORM: ConmedComrjFormData = {
  numero: '',
  data: '',
  processo: '',
  pregaoTad: '',
  vigencia: '',
  fornecedor: '',
  pacienteNip: '',
  pacienteIniciais: '',
  pacienteData: '',
  pacienteProcedimento: '',
  materiais: [createEmptyConmedMaterialItem()],
  valorPorPaciente: '',
}

function normalizeMaterialItem(
  value: Partial<ConmedComrjMaterialItem> | undefined,
): ConmedComrjMaterialItem {
  const item: ConmedComrjMaterialItem = {
    id: value?.id || createEmptyConmedMaterialItem().id,
    mapaDaSala: value?.mapaDaSala ?? '',
    danfe: value?.danfe ?? '',
    item: value?.item ?? '',
    nebPi: value?.nebPi ?? '',
    descricao: value?.descricao ?? '',
    qt: value?.qt ?? '',
    valorUnit: value?.valorUnit ?? '',
    valorTotal: value?.valorTotal ?? '',
  }
  return withRecalculatedMaterialTotal(item)
}

export function normalizeConmedComrjForm(
  value: ConmedComrjFormData | undefined,
): ConmedComrjFormData {
  const materiaisRaw = Array.isArray(value?.materiais) ? value.materiais : []
  const materiais =
    materiaisRaw.length > 0
      ? materiaisRaw.map((item) => normalizeMaterialItem(item))
      : [createEmptyConmedMaterialItem()]

  return {
    numero: value?.numero ?? '',
    data: value?.data ?? '',
    processo: value?.processo ?? '',
    pregaoTad: value?.pregaoTad ?? '',
    vigencia: value?.vigencia ?? '',
    fornecedor: value?.fornecedor ?? '',
    pacienteNip: value?.pacienteNip ?? '',
    pacienteIniciais: value?.pacienteIniciais ?? '',
    pacienteData: value?.pacienteData ?? '',
    pacienteProcedimento: value?.pacienteProcedimento ?? '',
    materiais,
    valorPorPaciente: calcValorPorPaciente(materiais),
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

/** NIP no formato 00.0000.00 */
export function formatConmedPacienteNip(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 6)}.${digits.slice(6)}`
}

/** Iniciais / procedimento / descrição em letras maiúsculas */
export function formatConmedUppercase(raw: string): string {
  return raw.toUpperCase()
}

/** Campos numéricos (só dígitos) */
export function formatConmedNumerico(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** QT: dígitos com vírgula decimal opcional */
export function formatConmedQuantidade(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, '')
  const firstComma = cleaned.indexOf(',')
  if (firstComma === -1) return cleaned.slice(0, 12)
  const intPart = cleaned.slice(0, firstComma).replace(/,/g, '').slice(0, 9)
  const decPart = cleaned
    .slice(firstComma + 1)
    .replace(/,/g, '')
    .slice(0, 3)
  return `${intPart},${decPart}`
}

/** NEB/PI: números ou letras maiúsculas */
export function formatConmedNebPi(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

/** Moeda BRL a partir dos dígitos (centavos) */
export function formatConmedMoeda(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 15)
  if (!digits) return ''
  const cents = Number.parseInt(digits, 10)
  if (!Number.isFinite(cents)) return ''
  return formatValorBrasileiro(cents / 100)
}

export function parseConmedQuantidade(raw: string): number {
  const n = Number.parseFloat(raw.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function calcMaterialValorTotal(qtRaw: string, valorUnitRaw: string): string {
  const qtd = parseConmedQuantidade(qtRaw)
  const unit = parseValorBrasileiro(valorUnitRaw)
  if (qtd <= 0 || unit <= 0) return ''
  return formatValorBrasileiro(qtd * unit)
}

export function withRecalculatedMaterialTotal(
  item: ConmedComrjMaterialItem,
): ConmedComrjMaterialItem {
  return {
    ...item,
    valorTotal: calcMaterialValorTotal(item.qt, item.valorUnit),
  }
}

export function calcValorPorPaciente(materiais: ConmedComrjMaterialItem[]): string {
  const total = materiais.reduce((sum, item) => {
    const line = parseValorBrasileiro(item.valorTotal)
    return sum + (Number.isFinite(line) ? line : 0)
  }, 0)
  return total > 0 ? formatValorBrasileiro(total) : ''
}

export function withRecalculatedMateriais(
  materiais: ConmedComrjMaterialItem[],
): Pick<ConmedComrjFormData, 'materiais' | 'valorPorPaciente'> {
  const next = materiais.map(withRecalculatedMaterialTotal)
  return {
    materiais: next,
    valorPorPaciente: calcValorPorPaciente(next),
  }
}

function materialHasContent(item: ConmedComrjMaterialItem): boolean {
  return Boolean(
    item.mapaDaSala ||
      item.danfe ||
      item.item ||
      item.nebPi ||
      item.descricao ||
      item.qt ||
      item.valorUnit ||
      item.valorTotal,
  )
}

/** Há conteúdo suficiente para exibir a planilha unificada ao vivo */
export function conmedFormHasPreviewContent(value: ConmedComrjFormData): boolean {
  return Boolean(
    value.numero ||
      value.data ||
      value.processo ||
      value.pregaoTad ||
      value.vigencia ||
      value.fornecedor ||
      value.pacienteNip ||
      value.pacienteIniciais ||
      value.pacienteData ||
      value.pacienteProcedimento ||
      value.materiais.some(materialHasContent),
  )
}

export function conmedProcessoSheetTitle(value: ConmedComrjFormData): string {
  if (value.processo.trim()) return `Processo ${value.processo.trim()}`
  if (value.numero.trim()) return `Nº ${value.numero.trim()}`
  return 'Processo (sem número)'
}
