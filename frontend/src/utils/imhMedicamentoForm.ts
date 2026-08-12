import type { ImhMedicamentoFormData, ImhMedicamentoLinha } from '@/types'
import type { CreatePedidoInput } from '@/services/clinicaPedidoService'
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
import type { ImhPlanilha } from '@/utils/imhPlanilhaTemplate'

export function createEmptyImhMedicamentoLinha(): ImhMedicamentoLinha {
  return {
    id: `imh-med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    data: '',
    nip: '',
    nome: '',
    itemPme: '',
    lote: '',
    validade: '',
    qtd: '1',
    valorUnitario: '',
    total: '',
    nipTitular: '',
    postoGrad: '',
    vinculo: '',
    pctIndenizar: '',
    valorIndenizar: '',
    om: '',
    unidadeFornecimento: '',
    quantidadeAdquirida: '',
  }
}

export const EMPTY_IMH_MEDICAMENTO_FORM: ImhMedicamentoFormData = {
  linhas: [],
  finalizedImhIds: [],
}

/** 20% dependente direto; 100% dependente indireto. */
export function pctIndenizarFromVinculo(vinculo: string): string | null {
  const normalized = vinculo
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!normalized) return null
  if (normalized.includes('INDIRETO')) return '100%'
  if (normalized.includes('DEPENDENTE DIRETO')) return '20%'
  return null
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
  { key: 'lote', label: 'LOTE', width: 110 },
  { key: 'validade', label: 'VALIDADE', width: 100 },
  { key: 'qtd', label: 'QTD', width: 56 },
  { key: 'valorUnitario', label: 'VALOR UNITÁRIO', width: 110 },
  { key: 'total', label: 'TOTAL', width: 110 },
  { key: 'nipTitular', label: 'NIP TITULAR', width: 108 },
  { key: 'postoGrad', label: 'POSTO/GRAD', width: 100 },
  { key: 'vinculo', label: 'VINCULO', width: 100 },
  { key: 'pctIndenizar', label: '% A INDENIZAR', width: 100 },
  { key: 'valorIndenizar', label: 'VALOR A INDENIZAR', width: 130 },
  { key: 'om', label: 'OM', width: 80 },
  { key: 'unidadeFornecimento', label: 'UNIDADE DE FORNECIMENTO', width: 140 },
  {
    key: 'quantidadeAdquirida',
    label: 'QUANTIDADE ADQUIRIDA PELA OMH/OMFM',
    width: 160,
  },
] as const

export type ImhMedicamentoColunaKey = (typeof IMH_MEDICAMENTO_COLUNAS)[number]['key']

export const IMH_MEDICAMENTO_WRAP_KEYS = new Set<ImhMedicamentoColunaKey>([
  'nome',
  'itemPme',
])

function parseQuantidade(raw: string): number {
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function parsePctIndenizar(raw: string): number {
  const cleaned = raw.trim().replace('%', '').replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > 1) return n / 100
  if (n === 1) return 1
  return n
}

export function withRecalculatedImhMedicamentoLinha(
  linha: ImhMedicamentoLinha,
): ImhMedicamentoLinha {
  const qtd = parseQuantidade(linha.qtd)
  const unit = parseValorBrasileiro(linha.valorUnitario)
  const total = qtd > 0 && unit > 0 ? unit * qtd : parseValorBrasileiro(linha.total)
  const totalFmt = total > 0 ? formatValorBrasileiro(total) : linha.total.trim()
  const pct = parsePctIndenizar(linha.pctIndenizar)
  const valorIndenizar = total > 0 && pct > 0 ? formatValorBrasileiro(total * pct) : ''
  return {
    ...linha,
    total: totalFmt,
    valorIndenizar,
  }
}

export function linhaImhMedicamentoHasContent(linha: ImhMedicamentoLinha): boolean {
  return Boolean(
    linha.data.trim() ||
      linha.nip.trim() ||
      linha.nome.trim() ||
      linha.itemPme.trim() ||
      linha.lote.trim() ||
      linha.validade.trim() ||
      (linha.qtd.trim() && linha.qtd.trim() !== '1') ||
      linha.valorUnitario.trim() ||
      linha.total.trim() ||
      linha.nipTitular.trim() ||
      linha.postoGrad.trim() ||
      linha.vinculo.trim() ||
      linha.pctIndenizar.trim() ||
      linha.valorIndenizar.trim() ||
      linha.om.trim() ||
      linha.unidadeFornecimento.trim() ||
      linha.quantidadeAdquirida.trim(),
  )
}

export function normalizeImhMedicamentoForm(
  value: ImhMedicamentoFormData | undefined,
): ImhMedicamentoFormData {
  const linhasRaw = Array.isArray(value?.linhas) ? value.linhas : []
  const linhas = linhasRaw
    .filter((item) => item && typeof item === 'object')
    .map((item) =>
      withRecalculatedImhMedicamentoLinha({
        id: item.id || createEmptyImhMedicamentoLinha().id,
        data: item.data ?? '',
        nip: item.nip ?? '',
        nome: item.nome ?? '',
        itemPme: item.itemPme ?? '',
        lote: item.lote ?? '',
        validade: item.validade ?? '',
        qtd: item.qtd ?? '',
        valorUnitario: item.valorUnitario ?? '',
        total: item.total ?? '',
        nipTitular: item.nipTitular ?? '',
        postoGrad: item.postoGrad ?? '',
        vinculo: item.vinculo ?? '',
        pctIndenizar: item.pctIndenizar ?? '',
        valorIndenizar: item.valorIndenizar ?? '',
        om: item.om ?? '',
        unidadeFornecimento: item.unidadeFornecimento ?? '',
        quantidadeAdquirida: item.quantidadeAdquirida ?? '',
      }),
    )
    .filter((linha) => linhaImhMedicamentoHasContent(linha))
  const linhaIds = new Set(linhas.map((l) => l.id))
  const finalizedRaw = Array.isArray(value?.finalizedImhIds) ? value.finalizedImhIds : []
  return {
    linhas,
    finalizedImhIds: finalizedRaw.filter((id) => typeof id === 'string' && linhaIds.has(id)),
  }
}

function formatDataHojeImh(): string {
  const d = new Date()
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function iniciaisFromNome(nome: string): string {
  const parts = nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export function buildImhPlanilhaFromMedicamentoLinhas(
  linhas: ImhMedicamentoLinha[],
): ImhPlanilha {
  return {
    cabecalho: {
      numeroRelacao: '',
      pregaoTad: '',
      data: formatDataHojeImh(),
      vigencia: '',
      processo: '',
      fornecedor: '',
    },
    linhas: linhas.map((linha, index) => {
      const valorFmt =
        parseValorBrasileiro(linha.total) > 0
          ? linha.total
          : parseValorBrasileiro(linha.valorUnitario) > 0
            ? linha.valorUnitario
            : ''
      return {
        id: `imh-med-envio-${linha.id}`,
        pacienteGrupoId: linha.id,
        isLinhaPaciente: true,
        numero: String(index + 1),
        nip: linha.nip,
        iniciais: iniciaisFromNome(linha.nome),
        data: linha.data,
        procedimento: linha.itemPme,
        mapaSala: '',
        danfe: '',
        item: String((index + 1) * 10),
        nebPi: '',
        descricaoMaterial: linha.itemPme,
        qt: linha.qtd.trim() || '1',
        valorUnit: linha.valorUnitario || valorFmt,
        valorTotal: valorFmt || linha.valorUnitario,
        subtotalPaciente: valorFmt || linha.valorUnitario,
      }
    }),
  }
}

export function imhMedicamentoLinhasToPedidoInput(
  linhas: ImhMedicamentoLinha[],
  clinicaNome: string,
): CreatePedidoInput {
  if (linhas.length === 1) {
    const linha = linhas[0]
    const valor =
      parseValorBrasileiro(linha.total) ||
      parseValorBrasileiro(linha.valorUnitario) ||
      0.01
    const qtd = parseQuantidade(linha.qtd) || 1
    const vinculoRaw = linha.vinculo.trim().toUpperCase()
    const vinculo = vinculoRaw.includes('DEP') ? 'DEPENDENTE' : 'TITULAR'
    return {
      consumoRowIds: [linha.id],
      paciente: {
        nome: linha.nome.trim() || '—',
        vinculo,
        nip: linha.nip.trim() || '—',
        nipTitular: linha.nipTitular.trim() || linha.nip.trim() || '—',
        nomeTitular: linha.nome.trim() || '—',
        tipoUsuario: 'MILITAR',
      },
      dadosClinica: {
        nomeClinica: clinicaNome,
        medico: '—',
        procedimento: linha.itemPme.trim() || 'Medicamento PME',
        dataCirurgia: new Date().toISOString().slice(0, 10),
        empresaConsignada: '—',
        pregao: '—',
        materialUtilizado: linha.itemPme.trim() || 'Medicamento PME',
        quantidade: qtd,
        valorUnitario: valor / qtd,
        valorTotal: valor,
        folhaSala: '',
        descricaoCirurgica: `Envio PME direto para Contabilidade/IMH — ${linha.nome.trim() || 'paciente'}.`,
        etiquetas: '',
        fotos: [],
      },
    }
  }

  const valorTotal = linhas.reduce((sum, linha) => {
    const v = parseValorBrasileiro(linha.total) || parseValorBrasileiro(linha.valorUnitario)
    return sum + (v > 0 ? v : 0)
  }, 0)
  const titulo = `Planilha IMH PME — ${linhas.length} lançamentos`

  return {
    consumoRowIds: linhas.map((linha) => linha.id),
    paciente: {
      nome: titulo,
      vinculo: 'TITULAR',
      nip: '—',
      nipTitular: '—',
      nomeTitular: titulo,
      tipoUsuario: 'MILITAR',
    },
    dadosClinica: {
      nomeClinica: clinicaNome,
      medico: '—',
      procedimento: `Lote PME com ${linhas.length} lançamentos`,
      dataCirurgia: new Date().toISOString().slice(0, 10),
      empresaConsignada: '—',
      pregao: '—',
      materialUtilizado: `${linhas.length} itens PME na planilha enviada`,
      quantidade: linhas.length,
      valorUnitario: valorTotal > 0 ? valorTotal / linhas.length : 0.01,
      valorTotal: valorTotal > 0 ? valorTotal : 0.01 * linhas.length,
      folhaSala: '',
      descricaoCirurgica: `Envio de planilha PME com ${linhas.length} lançamentos diretamente para Contabilidade/IMH.`,
      etiquetas: '',
      fotos: [],
    },
  }
}

export function markImhMedicamentoLinhasFinalized(
  value: ImhMedicamentoFormData,
  ids: string[],
): ImhMedicamentoFormData {
  const next = new Set(value.finalizedImhIds ?? [])
  for (const id of ids) next.add(id)
  return {
    ...value,
    finalizedImhIds: [...next],
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
