import type { ImhAbaFormData, ImhAbaLinha } from '@/types'
import {
  formatConmedData,
  formatConmedMoeda,
  formatConmedNumero,
  formatConmedPacienteNip,
  formatConmedQuantidade,
  formatConmedUppercase,
} from '@/utils/conmedComrjForm'
import {
  formatValorBrasileiro,
  parseValorBrasileiro,
} from '@/utils/consumoMaterialOds'

export function createEmptyImhAbaLinha(): ImhAbaLinha {
  return {
    id: `imh-linha-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    data: '',
    nip: '',
    nomeUsuario: '',
    vinculo: '',
    descricao: '',
    nipTitular: '',
    valorUnit: '',
    quantidade: '1',
    valorTotal: '',
    pctIndenizar: '',
  }
}

export const EMPTY_IMH_ABA_FORM: ImhAbaFormData = {
  clinica: '',
  numeroCp: '',
  linhas: [],
}

export const IMH_ABA_COLUNAS = [
  { key: 'data', label: 'DATA', width: 88 },
  { key: 'nip', label: 'NIP', width: 108 },
  { key: 'nomeUsuario', label: 'NOME DO USUÁRIO', width: 220 },
  { key: 'vinculo', label: 'VÍNCULO', width: 100 },
  { key: 'descricao', label: 'DESCRIÇÃO DO PROCEDIMENTO/MEDICAMENTO', width: 280 },
  { key: 'nipTitular', label: 'NIP DO TITULAR', width: 108 },
  { key: 'valorUnit', label: 'VALOR UNIT', width: 110 },
  { key: 'quantidade', label: 'QUANTI.', width: 72 },
  { key: 'valorTotal', label: 'VALOR TOTAL', width: 110 },
  { key: 'pctIndenizar', label: '% A INDENIZAR', width: 100 },
] as const

export type ImhAbaColunaKey = (typeof IMH_ABA_COLUNAS)[number]['key']

export const IMH_ABA_INSTITUICAO = 'MARINHA DO BRASIL'
export const IMH_ABA_HOSPITAL = 'HOSPITAL NAVAL MARCÍLIO DIAS'

export function withRecalculatedImhLinha(linha: ImhAbaLinha): ImhAbaLinha {
  const qtd = parseQuantidade(linha.quantidade)
  const unit = parseValorBrasileiro(linha.valorUnit)
  const total = qtd > 0 && unit > 0 ? unit * qtd : parseValorBrasileiro(linha.valorTotal)
  return {
    ...linha,
    valorTotal: total > 0 ? formatValorBrasileiro(total) : linha.valorTotal.trim(),
  }
}

function parseQuantidade(raw: string): number {
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function linhaHasContent(linha: ImhAbaLinha): boolean {
  return Boolean(
    linha.data.trim() ||
      linha.nip.trim() ||
      linha.nomeUsuario.trim() ||
      linha.vinculo.trim() ||
      linha.descricao.trim() ||
      linha.nipTitular.trim() ||
      linha.valorUnit.trim() ||
      (linha.quantidade.trim() && linha.quantidade.trim() !== '1') ||
      linha.valorTotal.trim() ||
      linha.pctIndenizar.trim(),
  )
}

export function normalizeImhAbaForm(value: ImhAbaFormData | undefined): ImhAbaFormData {
  const linhasRaw = Array.isArray(value?.linhas) ? value.linhas : []
  return {
    clinica: value?.clinica ?? '',
    numeroCp: value?.numeroCp ?? '',
    linhas: linhasRaw
      .filter((item) => item && typeof item === 'object')
      .map((item) =>
        withRecalculatedImhLinha({
          id: item.id || createEmptyImhAbaLinha().id,
          data: item.data ?? '',
          nip: item.nip ?? '',
          nomeUsuario: item.nomeUsuario ?? '',
          vinculo: item.vinculo ?? '',
          descricao: item.descricao ?? '',
          nipTitular: item.nipTitular ?? '',
          valorUnit: item.valorUnit ?? '',
          quantidade: item.quantidade ?? '',
          valorTotal: item.valorTotal ?? '',
          pctIndenizar: item.pctIndenizar ?? '',
        }),
      )
      .filter((linha) => linhaHasContent(linha)),
  }
}

export function imhFormHasPreviewContent(value: ImhAbaFormData): boolean {
  return Boolean(value.clinica.trim() || value.numeroCp.trim() || value.linhas.length > 0)
}

export function imhNumeroCpChip(value: ImhAbaFormData): string {
  const n = value.numeroCp.trim()
  return n ? `ANEXO DA CP — Nº CP ${n}` : 'ANEXO DA CP'
}

export function formatImhData(raw: string): string {
  return formatConmedData(raw)
}

export function formatImhNumeroCp(raw: string): string {
  return formatConmedNumero(raw)
}

export function formatImhNip(raw: string): string {
  return formatConmedPacienteNip(raw)
}

export function formatImhUppercase(raw: string): string {
  return formatConmedUppercase(raw)
}

export function formatImhQuantidade(raw: string): string {
  return formatConmedQuantidade(raw)
}

export function formatImhMoeda(raw: string): string {
  return formatConmedMoeda(raw)
}

export function calcImhTotalGeral(value: ImhAbaFormData): number {
  return value.linhas.reduce((sum, linha) => sum + parseValorBrasileiro(linha.valorTotal), 0)
}
