import seedData from '@/data/consumoMaterialSeed.json'
import type { Pedido } from '@/types'
import {
  formatValorBrasileiro,
  type ConsumoMaterialRow,
} from '@/utils/consumoMaterialOds'

export interface MesConsumoModelo {
  id: string
  label: string
  mes: number
  ano: number
  arquivo: string
}

export const CONSUMO_MESES_MODELO: MesConsumoModelo[] = [
  { id: '01-26', label: 'Janeiro/2026', mes: 1, ano: 2026, arquivo: '01-26 - JANEIRO - DEFINITIVA.ods' },
  { id: '02-26', label: 'Fevereiro/2026', mes: 2, ano: 2026, arquivo: '02-26 - FEVEREIRO - DEFINITIVA.ods' },
  { id: '03-26', label: 'Março/2026', mes: 3, ano: 2026, arquivo: '03-26 - MARÇO - DEFINITIVA.ods' },
  { id: '04-26', label: 'Abril/2026', mes: 4, ano: 2026, arquivo: '04-26 - ABRIL - DEFINITIVA.ods' },
  { id: '05-26', label: 'Maio/2026', mes: 5, ano: 2026, arquivo: '05-26 - MAIO - DEFINITIVA.ods' },
  { id: '06-26', label: 'Junho/2026', mes: 6, ano: 2026, arquivo: '06-26 - JUNHO - DEFINITIVA.ods' },
]

export const CONSUMO_MATERIAL_SEED: ConsumoMaterialRow[] = seedData as ConsumoMaterialRow[]

export const CONSUMO_PLANILHA_NOME_PADRAO = 'Modelos OPME TRO — Jan-Jun/2026'

export const CLINICA_CONSUMO_OPME_ID = 'clinica-opme-tro'
export const CLINICA_CONSUMO_OPME_NOME = 'OPME TRO'

export const TOTAL_LANCAMENTOS_MODELO = CONSUMO_MATERIAL_SEED.length

export function getConsumoMaterialInicial(): ConsumoMaterialRow[] {
  return CONSUMO_MATERIAL_SEED.map((row) => ({ ...row }))
}

export function rowIdFromPedidoId(pedidoId: string): string {
  return pedidoId.startsWith('pedido-') ? pedidoId.slice('pedido-'.length) : pedidoId
}

export function pedidoIdFromRowId(rowId: string): string {
  return `pedido-${rowId}`
}

function formatDataIsoParaPlanilha(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return ''
  const [, year, month, day] = match
  return `${day}/${month}/${year.slice(-2)}`
}

function parseDescricaoCirurgica(descricao: string): { diagnostico: string; cid: string } {
  const match = descricao.match(/ — CID (.+)$/)
  if (match) {
    return {
      diagnostico: descricao.replace(/ — CID .+$/, '').trim(),
      cid: match[1].trim(),
    }
  }
  return { diagnostico: descricao.trim(), cid: '' }
}

function buildRowFromPedido(pedido: Pedido): ConsumoMaterialRow {
  const paciente = pedido.paciente
  const dados = pedido.dadosClinica
  const { diagnostico, cid } = parseDescricaoCirurgica(dados?.descricaoCirurgica ?? '')
  const folhaParts = (dados?.folhaSala ?? '').split(' / ')
  const mapaSala = folhaParts[0]?.trim() ?? ''
  const mapa = folhaParts.slice(1).join(' / ').trim()
  const etiquetaParts = (dados?.etiquetas ?? '').split(' | ').map((p) => p.trim())
  const valorNumerico = dados?.valorTotal ?? pedido.valor ?? 0
  const numeroMatch = pedido.numero.match(/(\d+)\s*$/)

  return {
    id: rowIdFromPedidoId(pedido.id),
    numero: numeroMatch ? String(parseInt(numeroMatch[1], 10)) : '',
    postoGrad: '',
    nip: paciente?.nip ?? '',
    nome: paciente?.nome ?? '',
    iniciais: '',
    data: dados?.dataCirurgia ? formatDataIsoParaPlanilha(dados.dataCirurgia) : '',
    idade: '',
    diagnostico,
    cid,
    procedimento: dados?.procedimento ?? '',
    materiais: dados?.materialUtilizado ?? '',
    et: etiquetaParts[0] ?? '',
    fornecedor: dados?.empresaConsignada ?? '',
    cirurgiao: dados?.medico ?? '',
    mapaSala,
    mapa,
    ref: dados?.pregao?.split(' ')[0] ?? '',
    safin: dados?.pregao?.includes(' ') ? dados.pregao.split(' ').slice(1).join(' ') : '',
    empenho: etiquetaParts[2] ?? '',
    danfe: etiquetaParts[1] ?? '',
    valor: valorNumerico > 0 ? formatValorBrasileiro(valorNumerico) : '',
    valorNumerico,
    ata: etiquetaParts[3] ?? '',
  }
}

export function pedidoToConsumoRow(pedido: Pedido): ConsumoMaterialRow {
  if (pedido.id.startsWith('pedido-')) {
    const rowId = rowIdFromPedidoId(pedido.id)
    const seed = CONSUMO_MATERIAL_SEED.find((r) => r.id === rowId)
    if (seed) return { ...seed }
  }
  return buildRowFromPedido(pedido)
}

/** Monta a planilha a partir dos pedidos do sistema + rascunhos ainda não enviados */
export function buildPlanilhaLancamentos(
  pedidos: Pedido[],
  extraRows: ConsumoMaterialRow[] = [],
): ConsumoMaterialRow[] {
  const fromPedidos = pedidos.map(pedidoToConsumoRow)
  const pedidoIds = new Set(pedidos.map((p) => p.id))

  const extras = extraRows.filter((row) => {
    if (!isLinhaPreenchida(row)) return false
    return !pedidoIds.has(pedidoIdFromRowId(row.id))
  })

  return [...fromPedidos, ...extras]
}

export function getRowIdsComPedido(pedidos: Pedido[]): Set<string> {
  return new Set(pedidos.map((p) => rowIdFromPedidoId(p.id)))
}

/** Linhas vazias fixas ao final da planilha para novos lançamentos */
export const SLOTS_NOVOS_LANCAMENTOS = 15

export function getMesAtualModelo(): MesConsumoModelo {
  const now = new Date()
  const found = CONSUMO_MESES_MODELO.find(
    (m) => m.mes === now.getMonth() + 1 && m.ano === now.getFullYear(),
  )
  return found ?? CONSUMO_MESES_MODELO[0]
}

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const ANOS_PLANILHA_DISPONIVEIS = [2025, 2026, 2027]

export function getMesModeloFromParts(mes: number, ano: number): MesConsumoModelo {
  const found = CONSUMO_MESES_MODELO.find((m) => m.mes === mes && m.ano === ano)
  if (found) return found
  const anoCurto = String(ano).slice(-2)
  return {
    id: `${String(mes).padStart(2, '0')}-${anoCurto}`,
    label: `${MESES_NOMES[mes - 1]}/${ano}`,
    mes,
    ano,
    arquivo: '',
  }
}

export function dataPertenceAoMes(data: string, mesModelo: MesConsumoModelo): boolean {
  const match = data.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return false
  const [, , monthStr, yearStr] = match
  const month = parseInt(monthStr, 10)
  const year = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10)
  return month === mesModelo.mes && year === mesModelo.ano
}

export function isLinhaPreenchida(row: ConsumoMaterialRow): boolean {
  return Boolean(row.nip.trim())
}

export function isLinhaPlaceholder(row: ConsumoMaterialRow): boolean {
  return row.id.startsWith('slot-') && !isLinhaPreenchida(row)
}

export function rowPodeSerSelecionada(row: ConsumoMaterialRow): boolean {
  return isLinhaPreenchida(row)
}

export function rowPodeSerEnviada(
  row: ConsumoMaterialRow,
  rowIdsComPedido: Set<string>,
): boolean {
  return isLinhaPreenchida(row) && !rowIdsComPedido.has(row.id)
}

export function createLinhaVazia(id: string, numero: string): ConsumoMaterialRow {
  return {
    id,
    numero,
    postoGrad: '',
    nip: '',
    nome: '',
    iniciais: '',
    data: '',
    idade: '',
    diagnostico: '',
    cid: '',
    procedimento: '',
    materiais: '',
    et: '',
    fornecedor: '',
    cirurgiao: '',
    mapaSala: '',
    mapa: '',
    ref: '',
    safin: '',
    empenho: '',
    danfe: '',
    valor: '',
    valorNumerico: 0,
    ata: '',
  }
}

export function montarLinhasPlanilhaFixa(
  lancamentos: ConsumoMaterialRow[],
  mesModelo: MesConsumoModelo,
): ConsumoMaterialRow[] {
  const preenchidas = lancamentos.filter(
    (r) => isLinhaPreenchida(r) && dataPertenceAoMes(r.data, mesModelo),
  )
  const slots = Array.from({ length: SLOTS_NOVOS_LANCAMENTOS }, (_, i) =>
    createLinhaVazia(`slot-${mesModelo.id}-${i}`, String(preenchidas.length + i + 1)),
  )
  return [...preenchidas, ...slots]
}
