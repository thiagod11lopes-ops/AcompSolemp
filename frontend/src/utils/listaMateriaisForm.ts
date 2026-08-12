import type { ListaMateriaisFormData, ListaMateriaisLinha } from '@/types'
import {
  formatConmedMoeda,
  formatConmedNumerico,
  formatConmedQuantidade,
  formatConmedUppercase,
} from '@/utils/conmedComrjForm'

export function createEmptyListaMateriaisLinha(): ListaMateriaisLinha {
  return {
    id: `lista-mat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    item: '',
    pi: '',
    catmat: '',
    lote: '',
    especificacao: '',
    uf: '',
    qtdMin: '',
    qtdTotal: '',
    valor: '',
    fornecedor: '',
  }
}

export const EMPTY_LISTA_MATERIAIS_FORM: ListaMateriaisFormData = {
  apendice: '',
  linhas: [],
}

export const LISTA_MATERIAIS_COLUNAS = [
  { key: 'item', label: 'ITEM', width: 56 },
  { key: 'pi', label: 'PI', width: 110 },
  { key: 'catmat', label: 'CATMAT', width: 96 },
  { key: 'lote', label: 'LOTE', width: 96 },
  { key: 'especificacao', label: 'ESPECIFICAÇÃO', width: 320 },
  { key: 'uf', label: 'UF', width: 88 },
  { key: 'qtdMin', label: 'QTD MÍN.', width: 80 },
  { key: 'qtdTotal', label: 'QTD TOTAL', width: 88 },
  { key: 'valor', label: 'VALOR', width: 110 },
  { key: 'fornecedor', label: 'FORNECEDOR', width: 110 },
] as const

export type ListaMateriaisColunaKey = (typeof LISTA_MATERIAIS_COLUNAS)[number]['key']

export const LISTA_MATERIAIS_INSTITUICAO = 'MARINHA DO BRASIL'
export const LISTA_MATERIAIS_ORGAO = 'CENTRO DE OBTENÇÃO DA MARINHA NO RIO DE JANEIRO'
export const LISTA_MATERIAIS_RELACAO = 'RELAÇÃO DE ITENS'

export function linhaListaHasContent(linha: ListaMateriaisLinha): boolean {
  return Boolean(
    linha.item.trim() ||
      linha.pi.trim() ||
      linha.catmat.trim() ||
      linha.lote.trim() ||
      linha.especificacao.trim() ||
      linha.uf.trim() ||
      linha.qtdMin.trim() ||
      linha.qtdTotal.trim() ||
      linha.valor.trim() ||
      linha.fornecedor.trim(),
  )
}

export function normalizeListaMateriaisForm(
  value: ListaMateriaisFormData | undefined,
): ListaMateriaisFormData {
  const linhasRaw = Array.isArray(value?.linhas) ? value.linhas : []
  return {
    apendice: value?.apendice ?? '',
    linhas: linhasRaw
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: item.id || createEmptyListaMateriaisLinha().id,
        item: item.item ?? '',
        pi: item.pi ?? '',
        catmat: item.catmat ?? '',
        lote: item.lote ?? '',
        especificacao: item.especificacao ?? '',
        uf: item.uf ?? '',
        qtdMin: item.qtdMin ?? '',
        qtdTotal: item.qtdTotal ?? '',
        valor: item.valor ?? '',
        fornecedor: item.fornecedor ?? '',
      }))
      .filter((linha) => linhaListaHasContent(linha)),
  }
}

export function listaMateriaisHasPreviewContent(value: ListaMateriaisFormData): boolean {
  return Boolean(value.apendice.trim() || value.linhas.length > 0)
}

export function listaApendiceTitle(value: ListaMateriaisFormData): string {
  const raw = value.apendice.trim()
  if (!raw) return 'APÊNDICE III — PE'
  if (/ap[eê]ndice/i.test(raw)) return raw.toUpperCase()
  if (/^pe\b/i.test(raw)) return `APÊNDICE III — ${raw.toUpperCase()}`
  return `APÊNDICE III — PE ${raw}`
}

export function formatListaUppercase(raw: string): string {
  return formatConmedUppercase(raw)
}

export function formatListaItem(raw: string): string {
  return formatConmedNumerico(raw)
}

export function formatListaQuantidade(raw: string): string {
  return formatConmedQuantidade(raw)
}

export function formatListaMoeda(raw: string): string {
  return formatConmedMoeda(raw)
}

export function nextListaItemNumero(linhas: ListaMateriaisLinha[]): string {
  let max = 0
  for (const linha of linhas) {
    const n = parseInt(linha.item.replace(/\D/g, ''), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return String(max + 1)
}
