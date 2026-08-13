import type { ListaMedicamentosFormData, ListaMedicamentosLinha } from '@/types'
import { formatImhData, formatImhUppercase } from '@/utils/imhAbaForm'
import { formatPrecoReferenciaMedicamento } from '@/utils/medicamentosPrecos'
import type { MedicamentoPrecoRow } from '@/utils/medicamentosPrecos'

export function createEmptyListaMedicamentosLinha(): ListaMedicamentosLinha {
  return {
    id: `lista-med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    neb: '',
    medicamento: '',
    lote: '',
    validade: '',
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
  { key: 'validade', label: 'VALIDADE', width: 100 },
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
  const negative = raw.trim().startsWith('-')
  const cleaned = raw.replace(/[^\d,]/g, '')
  const firstComma = cleaned.indexOf(',')
  let result: string
  if (firstComma === -1) {
    result = cleaned.slice(0, 12)
  } else {
    const intPart = cleaned.slice(0, firstComma).replace(/,/g, '').slice(0, 9)
    const decPart = cleaned
      .slice(firstComma + 1)
      .replace(/,/g, '')
      .slice(0, 3)
    result = `${intPart},${decPart}`
  }
  if (!result) return negative ? '-' : ''
  return negative ? `-${result}` : result
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

/** Baixa estoque da linha (id da lista ou medicamento + lote) ao lançar no IMH. */
export function baixarEstoqueListaMedicamentos(
  form: ListaMedicamentosFormData,
  itemPme: string,
  lote: string,
  qtdBaixaRaw: string,
  listaMedicamentoId?: string,
): ListaMedicamentosFormData {
  return ajustarEstoqueListaMedicamentos(
    form,
    itemPme,
    lote,
    qtdBaixaRaw,
    'baixar',
    listaMedicamentoId,
  )
}

/** Devolve ao estoque a quantidade do lançamento IMH excluído. */
export function devolverEstoqueListaMedicamentos(
  form: ListaMedicamentosFormData,
  itemPme: string,
  lote: string,
  qtdDevolverRaw: string,
  listaMedicamentoId?: string,
): ListaMedicamentosFormData {
  return ajustarEstoqueListaMedicamentos(
    form,
    itemPme,
    lote,
    qtdDevolverRaw,
    'devolver',
    listaMedicamentoId,
  )
}

function formatQtdEstoque(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

function normMedKey(value: string): string {
  return value.trim().toUpperCase()
}

export function findListaMedicamentoById(
  id: string | undefined,
  form: ListaMedicamentosFormData | undefined,
): ListaMedicamentosLinha | null {
  const key = id?.trim()
  if (!key) return null
  return form?.linhas.find((linha) => linha.id === key) ?? null
}

/** Resolve a linha de estoque por id (preferencial) ou nome + lote. */
export function resolveListaMedicamentoEstoque(
  form: ListaMedicamentosFormData | undefined,
  itemPme: string,
  lote: string,
  listaMedicamentoId?: string,
): ListaMedicamentosLinha | null {
  return (
    findListaMedicamentoById(listaMedicamentoId, form) ??
    findListaMedicamentoByNomeELote(itemPme, lote, form)
  )
}

/** Resultado previsto da baixa (permite estoque negativo). */
export function previewBaixaEstoqueListaMedicamentos(
  form: ListaMedicamentosFormData | undefined,
  itemPme: string,
  lote: string,
  qtdBaixaRaw: string,
  listaMedicamentoId?: string,
): {
  encontrado: boolean
  listaMedicamentoId: string
  medicamento: string
  lote: string
  estoqueAtual: number
  qtdBaixa: number
  estoqueApos: number
  insuficiente: boolean
} | null {
  const qtdBaixa = parseListaMedQtdNumber(qtdBaixaRaw)
  const nome = itemPme.trim()
  if (!nome || qtdBaixa <= 0) return null
  const alvo = resolveListaMedicamentoEstoque(form, itemPme, lote, listaMedicamentoId)
  if (!alvo) {
    return {
      encontrado: false,
      listaMedicamentoId: '',
      medicamento: nome,
      lote: lote.trim(),
      estoqueAtual: 0,
      qtdBaixa,
      estoqueApos: -qtdBaixa,
      insuficiente: true,
    }
  }
  const estoqueAtual = parseListaMedQtdNumber(alvo.qtd)
  const estoqueApos = estoqueAtual - qtdBaixa
  return {
    encontrado: true,
    listaMedicamentoId: alvo.id,
    medicamento: alvo.medicamento.trim() || nome,
    lote: alvo.lote.trim() || lote.trim(),
    estoqueAtual,
    qtdBaixa,
    estoqueApos,
    insuficiente: estoqueApos < 0,
  }
}

function ajustarEstoqueListaMedicamentos(
  form: ListaMedicamentosFormData,
  itemPme: string,
  lote: string,
  qtdRaw: string,
  modo: 'baixar' | 'devolver',
  listaMedicamentoId?: string,
): ListaMedicamentosFormData {
  const nome = normMedKey(itemPme)
  const qtd = parseListaMedQtdNumber(qtdRaw)
  if ((!nome && !listaMedicamentoId?.trim()) || qtd <= 0) return form

  const alvo = resolveListaMedicamentoEstoque(form, itemPme, lote, listaMedicamentoId)
  if (!alvo) return form

  let changed = false
  const linhas = form.linhas.map((linha) => {
    if (linha.id !== alvo.id) return linha
    const atual = parseListaMedQtdNumber(linha.qtd)
    // Baixa pode deixar o estoque negativo (ex.: 8 − 10 = −2).
    const next = modo === 'baixar' ? atual - qtd : atual + qtd
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
      linha.validade.trim() ||
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
    validade: formatListaMedValidade(linha.validade),
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
          validade: item.validade ?? '',
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
      validade: '',
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

/** Validade no formato dd/mm/aaaa enquanto digita. */
export function formatListaMedValidade(raw: string): string {
  return formatImhData(raw)
}

export function findListaMedicamentosByNome(
  nome: string,
  form: ListaMedicamentosFormData | undefined,
): ListaMedicamentosLinha[] {
  const key = normMedKey(nome)
  if (!key) return []
  return (form?.linhas ?? []).filter((linha) => normMedKey(linha.medicamento) === key)
}

/** Retorna a linha só quando há exatamente um cadastro com aquele nome. */
export function findListaMedicamentoByNome(
  nome: string,
  form: ListaMedicamentosFormData | undefined,
): ListaMedicamentosLinha | null {
  const matches = findListaMedicamentosByNome(nome, form)
  return matches.length === 1 ? matches[0]! : null
}

/** Cada lote é uma linha: localiza por nome + lote. */
export function findListaMedicamentoByNomeELote(
  nome: string,
  lote: string,
  form: ListaMedicamentosFormData | undefined,
): ListaMedicamentosLinha | null {
  const nomeKey = normMedKey(nome)
  const loteKey = normMedKey(lote)
  if (!nomeKey) return null
  const matches = findListaMedicamentosByNome(nome, form)
  if (matches.length === 0) return null
  if (loteKey) {
    return matches.find((linha) => normMedKey(linha.lote) === loteKey) ?? null
  }
  const semLote = matches.filter((linha) => !normMedKey(linha.lote))
  if (semLote.length === 1) return semLote[0]!
  return matches.length === 1 ? matches[0]! : null
}

/** Rótulo das opções do Autocomplete no IMH (nome + lote + validade). */
export function formatListaMedEstoqueOptionLabel(linha: ListaMedicamentosLinha): string {
  const nome = linha.medicamento.trim() || '—'
  const parts = [nome]
  if (linha.lote.trim()) parts.push(`Lote ${linha.lote.trim()}`)
  if (linha.validade.trim()) parts.push(`Val. ${linha.validade.trim()}`)
  if (linha.qtd.trim()) parts.push(`QTD ${linha.qtd.trim()}`)
  return parts.join(' · ')
}

export function formatListaMedPreco(raw: string): string {
  return formatPrecoReferenciaMedicamento(raw) || raw
}
