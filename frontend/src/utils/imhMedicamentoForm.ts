import type { ImhMedicamentoFormData, ImhMedicamentoLinha } from '@/types'
import {
  formatImhData,
  formatImhMoeda,
  formatImhNip,
  formatImhQuantidade,
  formatImhUppercase,
} from '@/utils/imhAbaForm'
import {
  formatValorBrasileiro,
  parseValorBrasileiro,
} from '@/utils/consumoMaterialOds'

export function createEmptyImhMedicamentoLinha(): ImhMedicamentoLinha {
  return {
    id: `imh-med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    data: '',
    nip: '',
    nome: '',
    itemPme: '',
    qtd: '1',
    valorUnitario: '',
    total: '',
    nipTitular: '',
    postoGrad: '',
    vinculo: '',
    pctIndenizar: '',
    om: '',
    unidadeFornecimento: '',
    quantidadeAdquirida: '',
    maneiraDispensacao: '',
  }
}

export const EMPTY_IMH_MEDICAMENTO_FORM: ImhMedicamentoFormData = {
  linhas: [],
}

export const IMH_MEDICAMENTO_COLUNAS = [
  { key: 'data', label: 'DATA', width: 88 },
  { key: 'nip', label: 'NIP', width: 108 },
  { key: 'nome', label: 'NOME', width: 200 },
  {
    key: 'itemPme',
    label: 'ITEM (PME) — DESCRIÇÃO DO MEDICAMENTO',
    width: 280,
  },
  { key: 'qtd', label: 'QTD', width: 56 },
  { key: 'valorUnitario', label: 'VALOR UNITÁRIO', width: 110 },
  { key: 'total', label: 'TOTAL', width: 110 },
  { key: 'nipTitular', label: 'NIP TITULAR', width: 108 },
  { key: 'postoGrad', label: 'POSTO/GRAD', width: 100 },
  { key: 'vinculo', label: 'VINCULO', width: 100 },
  { key: 'pctIndenizar', label: '% A INDENIZAR', width: 100 },
  { key: 'om', label: 'OM', width: 80 },
  { key: 'unidadeFornecimento', label: 'UNIDADE DE FORNECIMENTO', width: 140 },
  {
    key: 'quantidadeAdquirida',
    label: 'QUANTIDADE ADQUIRIDA PELA OMH/OMFM',
    width: 160,
  },
  {
    key: 'maneiraDispensacao',
    label: 'MANEIRA DE DISPENSAÇÃO (PELA OMH-OMFM/POR OSE)',
    width: 200,
  },
] as const

export type ImhMedicamentoColunaKey = (typeof IMH_MEDICAMENTO_COLUNAS)[number]['key']

export const IMH_MEDICAMENTO_WRAP_KEYS = new Set<ImhMedicamentoColunaKey>([
  'nome',
  'itemPme',
  'maneiraDispensacao',
])

function parseQuantidade(raw: string): number {
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function withRecalculatedImhMedicamentoLinha(
  linha: ImhMedicamentoLinha,
): ImhMedicamentoLinha {
  const qtd = parseQuantidade(linha.qtd)
  const unit = parseValorBrasileiro(linha.valorUnitario)
  const total = qtd > 0 && unit > 0 ? unit * qtd : parseValorBrasileiro(linha.total)
  return {
    ...linha,
    total: total > 0 ? formatValorBrasileiro(total) : linha.total.trim(),
  }
}

export function linhaImhMedicamentoHasContent(linha: ImhMedicamentoLinha): boolean {
  return Boolean(
    linha.data.trim() ||
      linha.nip.trim() ||
      linha.nome.trim() ||
      linha.itemPme.trim() ||
      (linha.qtd.trim() && linha.qtd.trim() !== '1') ||
      linha.valorUnitario.trim() ||
      linha.total.trim() ||
      linha.nipTitular.trim() ||
      linha.postoGrad.trim() ||
      linha.vinculo.trim() ||
      linha.pctIndenizar.trim() ||
      linha.om.trim() ||
      linha.unidadeFornecimento.trim() ||
      linha.quantidadeAdquirida.trim() ||
      linha.maneiraDispensacao.trim(),
  )
}

export function normalizeImhMedicamentoForm(
  value: ImhMedicamentoFormData | undefined,
): ImhMedicamentoFormData {
  const linhasRaw = Array.isArray(value?.linhas) ? value.linhas : []
  return {
    linhas: linhasRaw
      .filter((item) => item && typeof item === 'object')
      .map((item) =>
        withRecalculatedImhMedicamentoLinha({
          id: item.id || createEmptyImhMedicamentoLinha().id,
          data: item.data ?? '',
          nip: item.nip ?? '',
          nome: item.nome ?? '',
          itemPme: item.itemPme ?? '',
          qtd: item.qtd ?? '',
          valorUnitario: item.valorUnitario ?? '',
          total: item.total ?? '',
          nipTitular: item.nipTitular ?? '',
          postoGrad: item.postoGrad ?? '',
          vinculo: item.vinculo ?? '',
          pctIndenizar: item.pctIndenizar ?? '',
          om: item.om ?? '',
          unidadeFornecimento: item.unidadeFornecimento ?? '',
          quantidadeAdquirida: item.quantidadeAdquirida ?? '',
          maneiraDispensacao: item.maneiraDispensacao ?? '',
        }),
      )
      .filter((linha) => linhaImhMedicamentoHasContent(linha)),
  }
}

export function imhMedicamentoHasPreviewContent(value: ImhMedicamentoFormData): boolean {
  return value.linhas.length > 0
}

export function calcImhMedicamentoTotalGeral(value: ImhMedicamentoFormData): number {
  return value.linhas.reduce((sum, linha) => sum + parseValorBrasileiro(linha.total), 0)
}

export {
  formatImhData as formatImhMedData,
  formatImhMoeda as formatImhMedMoeda,
  formatImhNip as formatImhMedNip,
  formatImhQuantidade as formatImhMedQtd,
  formatImhUppercase as formatImhMedUppercase,
}
