import type {
  ConmedComrjFormData,
  ConmedComrjMaterialItem,
  ConmedComrjPaciente,
} from '@/types'
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

export function createEmptyConmedPaciente(): ConmedComrjPaciente {
  return {
    id: `pac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nip: '',
    iniciais: '',
    data: '',
    procedimento: '',
    materiais: [],
    valorPorPaciente: '',
  }
}

export const EMPTY_CONMED_COMRJ_FORM: ConmedComrjFormData = {
  numero: '',
  data: '',
  processo: '',
  pregaoTad: '',
  vigencia: '',
  fornecedor: '',
  pacientes: [],
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

export function withRecalculatedPaciente(paciente: ConmedComrjPaciente): ConmedComrjPaciente {
  const materiais = paciente.materiais
    .map(withRecalculatedMaterialTotal)
    .filter((item) => materialHasContent(item))
  return {
    ...paciente,
    materiais,
    valorPorPaciente: calcValorPorPaciente(materiais),
  }
}

function normalizePaciente(
  value: Partial<ConmedComrjPaciente> | undefined,
): ConmedComrjPaciente {
  const materiaisRaw = Array.isArray(value?.materiais) ? value.materiais : []
  return withRecalculatedPaciente({
    id: value?.id || createEmptyConmedPaciente().id,
    nip: value?.nip ?? '',
    iniciais: value?.iniciais ?? '',
    data: value?.data ?? '',
    procedimento: value?.procedimento ?? '',
    materiais: materiaisRaw.map((item) => normalizeMaterialItem(item)),
    valorPorPaciente: value?.valorPorPaciente ?? '',
  })
}

/** Migra formato antigo (paciente flat + materiais) para pacientes[]. */
function migrateLegacyPacientes(value: Record<string, unknown> | undefined): ConmedComrjPaciente[] {
  if (!value) return []
  if (Array.isArray(value.pacientes)) {
    return (value.pacientes as Partial<ConmedComrjPaciente>[])
      .map((p) => normalizePaciente(p))
      .filter((p) => pacienteHasContent(p) || p.materiais.length > 0)
  }

  const materiaisRaw = Array.isArray(value.materiais)
    ? (value.materiais as Partial<ConmedComrjMaterialItem>[])
    : []
  const materiais = materiaisRaw
    .map((item) => normalizeMaterialItem(item))
    .filter((item) => materialHasContent(item))

  const legacy: ConmedComrjPaciente = withRecalculatedPaciente({
    id: createEmptyConmedPaciente().id,
    nip: String(value.pacienteNip ?? ''),
    iniciais: String(value.pacienteIniciais ?? ''),
    data: String(value.pacienteData ?? ''),
    procedimento: String(value.pacienteProcedimento ?? ''),
    materiais,
    valorPorPaciente: '',
  })

  return pacienteHasContent(legacy) || legacy.materiais.length > 0 ? [legacy] : []
}

export function normalizeConmedComrjForm(
  value: ConmedComrjFormData | undefined,
): ConmedComrjFormData {
  const raw = value as (ConmedComrjFormData & Record<string, unknown>) | undefined
  return {
    numero: value?.numero ?? '',
    data: value?.data ?? '',
    processo: value?.processo ?? '',
    pregaoTad: value?.pregaoTad ?? '',
    vigencia: value?.vigencia ?? '',
    fornecedor: value?.fornecedor ?? '',
    pacientes: migrateLegacyPacientes(raw),
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
): { materiais: ConmedComrjMaterialItem[]; valorPorPaciente: string } {
  const next = materiais.map(withRecalculatedMaterialTotal)
  return {
    materiais: next,
    valorPorPaciente: calcValorPorPaciente(next),
  }
}

export function materialHasContent(item: ConmedComrjMaterialItem): boolean {
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

export function pacienteHasContent(paciente: ConmedComrjPaciente): boolean {
  return Boolean(
    paciente.nip ||
      paciente.iniciais ||
      paciente.data ||
      paciente.procedimento ||
      paciente.materiais.some(materialHasContent),
  )
}

export function countConmedMateriais(value: ConmedComrjFormData): number {
  return value.pacientes.reduce((sum, p) => sum + p.materiais.length, 0)
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
      value.pacientes.some((p) => pacienteHasContent(p)),
  )
}

export function conmedProcessoSheetTitle(value: ConmedComrjFormData): string {
  if (value.processo.trim()) return `Processo ${value.processo.trim()}`
  if (value.numero.trim()) return `Nº ${value.numero.trim()}`
  return 'Processo (sem número)'
}
