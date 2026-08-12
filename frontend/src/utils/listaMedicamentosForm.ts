import type { ListaMedicamentosFormData, ListaMedicamentosLinha } from '@/types'
import { formatImhUppercase } from '@/utils/imhAbaForm'
import { formatPrecoReferenciaMedicamento } from '@/utils/medicamentosPrecos'
import type { MedicamentoPrecoRow } from '@/utils/medicamentosPrecos'

export function createEmptyListaMedicamentosLinha(): ListaMedicamentosLinha {
  return {
    id: `lista-med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    neb: '',
    medicamento: '',
    lote: '',
    uf: '',
    qtd: '',
    estoqueBaixo: '',
    precoReferencia: '',
  }
}

export const EMPTY_LISTA_MEDICAMENTOS_FORM: ListaMedicamentosFormData = {
  linhas: [],
}

export const LISTA_MEDICAMENTOS_COLUNAS = [
  { key: 'neb', label: 'NEB', width: 120 },
  { key: 'medicamento', label: 'Medicamento', width: 420 },
  { key: 'lote', label: 'LOTE', width: 110 },
  { key: 'uf', label: 'UF', width: 64 },
  { key: 'qtd', label: 'QTD', width: 72 },
  { key: 'precoReferencia', label: 'Preço referência 2026', width: 150 },
] as const

export type ListaMedicamentosColunaKey = (typeof LISTA_MEDICAMENTOS_COLUNAS)[number]['key']

export type ListaMedEstoqueStatus = 'ok' | 'baixo' | 'zerado'
export type ListaMedEstoqueFiltro = 'todos' | 'baixo' | 'zerado'

export function parseListaMedQtdNumber(raw: string): number {
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.')
  if (!cleaned) return 0
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

export function formatListaMedQtd(raw: string): string {
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

export function getListaMedEstoqueStatus(linha: ListaMedicamentosLinha): ListaMedEstoqueStatus {
  const raw = linha.qtd.trim()
  if (!raw) return 'ok'
  const qtd = parseListaMedQtdNumber(raw)
  if (qtd <= 0) return 'zerado'
  const limiarRaw = linha.estoqueBaixo.trim()
  if (limiarRaw) {
    const limiar = parseListaMedQtdNumber(limiarRaw)
    if (qtd <= limiar) return 'baixo'
  }
  return 'ok'
}

export function countListaMedEstoque(
  value: ListaMedicamentosFormData,
): { baixo: number; zerado: number } {
  let baixo = 0
  let zerado = 0
  for (const linha of value.linhas) {
    const status = getListaMedEstoqueStatus(linha)
    if (status === 'zerado') zerado += 1
    else if (status === 'baixo') baixo += 1
  }
  return { baixo, zerado }
}

export function filterListaMedicamentosByEstoque(
  value: ListaMedicamentosFormData,
  filtro: ListaMedEstoqueFiltro,
): ListaMedicamentosLinha[] {
  if (filtro === 'todos') return value.linhas
  return value.linhas.filter((linha) => getListaMedEstoqueStatus(linha) === filtro)
}

/** Baixa estoque do medicamento (match por nome) ao lançar no IMH. */
export function baixarEstoqueListaMedicamentos(
  form: ListaMedicamentosFormData,
  itemPme: string,
  qtdBaixaRaw: string,
): ListaMedicamentosFormData {
  return ajustarEstoqueListaMedicamentos(form, itemPme, qtdBaixaRaw, 'baixar')
}

/** Devolve ao estoque a quantidade do lançamento IMH excluído. */
export function devolverEstoqueListaMedicamentos(
  form: ListaMedicamentosFormData,
  itemPme: string,
  qtdDevolverRaw: string,
): ListaMedicamentosFormData {
  return ajustarEstoqueListaMedicamentos(form, itemPme, qtdDevolverRaw, 'devolver')
}

function formatQtdEstoque(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

function ajustarEstoqueListaMedicamentos(
  form: ListaMedicamentosFormData,
  itemPme: string,
  qtdRaw: string,
  modo: 'baixar' | 'devolver',
): ListaMedicamentosFormData {
  const nome = itemPme.trim().toUpperCase()
  const qtd = parseListaMedQtdNumber(qtdRaw)
  if (!nome || qtd <= 0) return form

  let changed = false
  const linhas = form.linhas.map((linha) => {
    if (linha.medicamento.trim().toUpperCase() !== nome) return linha
    const atual = parseListaMedQtdNumber(linha.qtd)
    const next = modo === 'baixar' ? Math.max(0, atual - qtd) : atual + qtd
    changed = true
    return { ...linha, qtd: formatQtdEstoque(next) }
  })

  return changed ? { linhas } : form
}

export function linhaListaMedicamentosHasContent(linha: ListaMedicamentosLinha): boolean {
  return Boolean(
    linha.neb.trim() ||
      linha.medicamento.trim() ||
      linha.lote.trim() ||
      linha.uf.trim() ||
      linha.qtd.trim() ||
      linha.estoqueBaixo.trim() ||
      linha.precoReferencia.trim(),
  )
}

export function withNormalizedListaMedicamentosLinha(
  linha: ListaMedicamentosLinha,
): ListaMedicamentosLinha {
  return {
    ...linha,
    neb: linha.neb.trim(),
    medicamento: linha.medicamento.trim(),
    lote: formatImhUppercase(linha.lote).trim(),
    uf: formatImhUppercase(linha.uf).trim(),
    qtd: linha.qtd.trim(),
    estoqueBaixo: linha.estoqueBaixo.trim(),
    precoReferencia:
      formatPrecoReferenciaMedicamento(linha.precoReferencia) || linha.precoReferencia.trim(),
  }
}

export function normalizeListaMedicamentosForm(
  value: ListaMedicamentosFormData | undefined,
): ListaMedicamentosFormData {
  const linhasRaw = Array.isArray(value?.linhas) ? value.linhas : []
  return {
    linhas: linhasRaw
      .filter((item) => item && typeof item === 'object')
      .map((item) =>
        withNormalizedListaMedicamentosLinha({
          id: item.id || createEmptyListaMedicamentosLinha().id,
          neb: item.neb ?? '',
          medicamento: item.medicamento ?? '',
          lote: item.lote ?? '',
          uf: item.uf ?? '',
          qtd: item.qtd ?? '',
          estoqueBaixo: item.estoqueBaixo ?? '',
          precoReferencia: item.precoReferencia ?? '',
        }),
      )
      .filter((linha) => linhaListaMedicamentosHasContent(linha)),
  }
}

export function listaMedicamentosHasPreviewContent(value: ListaMedicamentosFormData): boolean {
  return value.linhas.length > 0
}

export function listaMedicamentosToPrecosRows(
  value: ListaMedicamentosFormData,
): MedicamentoPrecoRow[] {
  return normalizeListaMedicamentosForm(value).linhas.map((linha) => ({
    id: linha.id,
    neb: linha.neb,
    medicamento: linha.medicamento,
    uf: linha.uf,
    precoReferencia: linha.precoReferencia,
  }))
}

export function listaMedicamentosFromPrecosRows(
  rows: MedicamentoPrecoRow[] | undefined,
): ListaMedicamentosFormData {
  return normalizeListaMedicamentosForm({
    linhas: (rows ?? []).map((row) => ({
      id: row.id || createEmptyListaMedicamentosLinha().id,
      neb: row.neb ?? '',
      medicamento: row.medicamento ?? '',
      lote: '',
      uf: row.uf ?? '',
      qtd: '',
      estoqueBaixo: '',
      precoReferencia: row.precoReferencia ?? '',
    })),
  })
}

export function formatListaMedNeb(raw: string): string {
  return raw.trim().toUpperCase()
}

export function formatListaMedUf(raw: string): string {
  return formatImhUppercase(raw).slice(0, 8)
}

export function formatListaMedNome(raw: string): string {
  return formatImhUppercase(raw)
}

export function formatListaMedLote(raw: string): string {
  return formatImhUppercase(raw).slice(0, 24)
}

export function findListaMedicamentoByNome(
  nome: string,
  form: ListaMedicamentosFormData | undefined,
): ListaMedicamentosLinha | null {
  const key = nome.trim().toUpperCase()
  if (!key) return null
  return (
    form?.linhas.find((linha) => linha.medicamento.trim().toUpperCase() === key) ?? null
  )
}

export function formatListaMedPreco(raw: string): string {
  return formatPrecoReferenciaMedicamento(raw) || raw
}
