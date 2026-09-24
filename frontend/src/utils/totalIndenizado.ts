import type { AppData, ImhAbaLinha, ImhMedicamentoLinha, Pedido, WorkflowEtapa } from '@/types'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import {
  calcValorIndenizar,
  normalizeConsumoMaterialRows,
  parseValorBrasileiro,
} from '@/utils/consumoMaterialOds'
import { pedidoPlanilhaArquivada } from '@/utils/consumoMaterialTemplate'
import { normalizeImhAbaForm } from '@/utils/imhAbaForm'
import { normalizeImhMedicamentoForm } from '@/utils/imhMedicamentoForm'
import { dateMatchesBalancoPeriodo, type BalancoPeriodoTipo } from '@/utils/medicamentoBalanco'
import { normalizePacienteNipKey } from '@/utils/pacientesPme'
import {
  pedidoEtapaConcluidaParaChave,
  pedidoPendenteParaChave,
} from '@/utils/perfilEtapa'

export type TotalIndenizadoPeriodoTipo = BalancoPeriodoTipo

/** Já finalizado em Contabilidade/IMH vs ainda em Auditoria ou Contabilidade/IMH */
export type IndenizadoLinhaStatus = 'a_indenizar' | 'indenizado'

export interface TotalIndenizadoLinha {
  /** Chave única para deduplicação entre fontes */
  linhaKey: string
  data: string
  valorIndenizado: number
  nip: string
  status: IndenizadoLinhaStatus
  pedidoId?: string
}

export interface TotalIndenizadoFiltro {
  tipo: TotalIndenizadoPeriodoTipo
  referencia: Date
}

export interface LinhasIndenizadoPorStatus {
  aIndenizar: TotalIndenizadoLinha[]
  indenizado: TotalIndenizadoLinha[]
}

function parseIsoOrBrDate(raw: string | undefined | null): Date | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (br) {
    const day = parseInt(br[1], 10)
    const month = parseInt(br[2], 10) - 1
    let year = parseInt(br[3], 10)
    if (br[3].length === 2) year = 2000 + year
    const d = new Date(year, month, day)
    if (Number.isNaN(d.getTime())) return null
    d.setHours(0, 0, 0, 0)
    return d
  }
  const iso = new Date(trimmed)
  if (Number.isNaN(iso.getTime())) return null
  iso.setHours(0, 0, 0, 0)
  return iso
}

function parsePctIndenizar(raw: string | undefined | null): number {
  const cleaned = (raw ?? '').replace(/[^\d,.-]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n > 1 ? n / 100 : n
}

/**
 * Valor da coluna % A INDENIZAR:
 * - se houver valorIndenizar monetário, usa-o;
 * - senão aplica o percentual sobre o total.
 */
function valorIndenizadoFromParts(
  total: number,
  pctRaw: string | null | undefined,
  valorIndenizarRaw?: string | null,
): number {
  const direto = parseValorBrasileiro(valorIndenizarRaw)
  if (direto > 0) return direto
  if (total <= 0) return 0
  const pct = parsePctIndenizar(pctRaw)
  if (pct <= 0) {
    const calculado = calcValorIndenizar(total, pctRaw)
    return parseValorBrasileiro(calculado)
  }
  return total * pct
}

function nipContabilizavel(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim() ?? ''
  if (!trimmed || trimmed === '—' || trimmed === '-') return null
  const key = normalizePacienteNipKey(trimmed)
  return key.length >= 4 ? key : null
}

/** Chave de NIP; se ausente, usa o id da linha para não perder o valor no fluxo. */
function nipOuLinhaKey(nip: string | undefined | null, linhaId: string): string {
  return nipContabilizavel(nip) ?? `linha:${linhaId}`
}

/**
 * Soma a coluna % A INDENIZAR das linhas vinculadas ao pedido
 * (IMH aba, IMH medicamento e consumo consignado).
 */
export function somarPctIndenizarDoPedido(data: AppData, pedido: Pedido): number {
  const rowIds = new Set(pedido.consumoRowIds ?? [])
  const planilha = data.pedidoPlanilhaEnvio?.[pedido.id]
  for (const linha of planilha?.imhMedicamentoLinhas ?? []) {
    rowIds.add(linha.id)
  }

  if (rowIds.size === 0 && !planilha) return 0

  let total = 0
  const clinicaId = pedido.clinicaId

  const consumo = data.consumoPlanilha?.[clinicaId]
  if (consumo) {
    const abasExtras = Array.isArray(consumo.abasExtras) ? consumo.abasExtras : []
    const rows = normalizeConsumoMaterialRows([
      ...(Array.isArray(consumo.extraRows) ? consumo.extraRows : []),
      ...abasExtras.flatMap((aba) => (Array.isArray(aba?.extraRows) ? aba.extraRows : [])),
    ])
    for (const row of rows) {
      if (!rowIds.has(row.id)) continue
      total += linhaConsumoIndenizado(row)
    }
  }

  const livres = data.planilhasLivres?.[clinicaId]
  if (livres) {
    const consumoRows = normalizeConsumoMaterialRows(livres.consumoMaterialConsignado)
    for (const row of consumoRows) {
      if (!rowIds.has(row.id)) continue
      total += linhaConsumoIndenizado(row)
    }

    const imhMedicamento = normalizeImhMedicamentoForm(livres.imhMedicamento)
    for (const linha of imhMedicamento.linhas) {
      if (!rowIds.has(linha.id)) continue
      total += linhaMedicamentoIndenizado(linha)
    }

    const imh = normalizeImhAbaForm(livres.imh)
    for (const linha of imh.linhas) {
      if (!rowIds.has(linha.id)) continue
      total += linhaImhAbaIndenizado(linha)
    }
  }

  // Fallback: planilha IMH medicamento anexada ao pedido
  if (total <= 0) {
    for (const linha of planilha?.imhMedicamentoLinhas ?? []) {
      total += linhaMedicamentoIndenizado(linha)
    }
  }

  return total
}

function linhaMedicamentoIndenizado(linha: ImhMedicamentoLinha): number {
  const total = parseValorBrasileiro(linha.total ?? '')
  return valorIndenizadoFromParts(total, linha.pctIndenizar, linha.valorIndenizar)
}

function parseQtdConsumo(raw: string | undefined | null): number {
  const cleaned = (raw ?? '').trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function linhaConsumoIndenizado(row: ConsumoMaterialRow): number {
  const valorNumerico = typeof row.valorNumerico === 'number' ? row.valorNumerico : 0
  const total =
    valorNumerico > 0
      ? valorNumerico
      : parseValorBrasileiro(row.valor) ||
        parseValorBrasileiro(row.valorUnitario) * parseQtdConsumo(row.qtd)
  return valorIndenizadoFromParts(total, row.pctIndenizar, row.valorIndenizar)
}

/** Na aba IMH, a coluna % A INDENIZAR já guarda o valor monetário a indenizar. */
function linhaImhAbaIndenizado(linha: ImhAbaLinha): number {
  const direto = parseValorBrasileiro(linha.pctIndenizar)
  if (direto > 0) return direto
  const total = parseValorBrasileiro(linha.valorTotal ?? '')
  return valorIndenizadoFromParts(total, '', '')
}

function buildExclusoesDevolucao(data: AppData): Set<string> {
  const excluidos = new Set<string>()

  for (const [clinicaId, state] of Object.entries(data.consumoPlanilha ?? {})) {
    for (const id of state.devolvidosAuditoriaRowIds ?? []) {
      excluidos.add(`${clinicaId}:${id}`)
    }
    for (const id of state.devolvidosMaterialRowIds ?? []) {
      excluidos.add(`${clinicaId}:${id}`)
    }
  }

  for (const [clinicaId, state] of Object.entries(data.planilhasLivres ?? {})) {
    for (const id of state.imhMedicamento?.devolvidosImhIds ?? []) {
      excluidos.add(`${clinicaId}:${id}`)
    }
  }

  for (const pedido of data.pedidos) {
    if (!pedido.planilhaDevolvidaParaChave) continue
    const clinicaId = pedido.clinicaId
    for (const id of pedido.consumoRowIds ?? []) {
      excluidos.add(`${clinicaId}:${id}`)
    }
    const planilha = data.pedidoPlanilhaEnvio?.[pedido.id]
    for (const linha of planilha?.imhMedicamentoLinhas ?? []) {
      excluidos.add(`${clinicaId}:${linha.id}`)
    }
  }

  return excluidos
}

function buildLinhaPedidoIndex(data: AppData): Map<string, Pedido> {
  const map = new Map<string, Pedido>()
  for (const pedido of data.pedidos) {
    const clinicaId = pedido.clinicaId
    for (const rowId of pedido.consumoRowIds ?? []) {
      map.set(`${clinicaId}:${rowId}`, pedido)
    }
    const planilha = data.pedidoPlanilhaEnvio?.[pedido.id]
    for (const linha of planilha?.imhMedicamentoLinhas ?? []) {
      map.set(`${clinicaId}:${linha.id}`, pedido)
    }
  }
  return map
}

function classificarStatusIndenizado(
  pedido: Pedido | undefined,
  etapas: WorkflowEtapa[],
  data: AppData,
): IndenizadoLinhaStatus | null {
  if (!pedido) return null

  const processos = data.processosArquivados
  const finalizadoImh =
    pedidoPlanilhaArquivada(pedido.id, data.pedidoPlanilhaEnvio, processos) ||
    pedidoEtapaConcluidaParaChave(pedido, etapas, 'DIV_MAT_CONTABILIDADE_IMH', processos)

  if (finalizadoImh) return 'indenizado'

  const emAuditoria = pedidoPendenteParaChave(
    pedido,
    etapas,
    'DIV_MAT_AUDITORIA',
    processos,
  )
  const emContabilidade = pedidoPendenteParaChave(
    pedido,
    etapas,
    'DIV_MAT_CONTABILIDADE_IMH',
    processos,
  )

  if (emAuditoria || emContabilidade) return 'a_indenizar'
  return null
}

function registrarLinha(
  map: Map<string, TotalIndenizadoLinha>,
  params: {
    clinicaId: string
    linhaId: string
    data: string
    nip: string
    valorIndenizado: number
    excluidos: Set<string>
    linhaPedidoIndex: Map<string, Pedido>
    etapas: WorkflowEtapa[]
    appData: AppData
  },
): void {
  const {
    clinicaId,
    linhaId,
    data,
    nip,
    valorIndenizado,
    excluidos,
    linhaPedidoIndex,
    etapas,
    appData,
  } = params
  const linhaKey = `${clinicaId}:${linhaId}`
  if (excluidos.has(linhaKey)) return
  const nipKey = nipOuLinhaKey(nip, linhaId)
  if (valorIndenizado <= 0) return
  const dataTrimmed = (data ?? '').trim()
  if (!dataTrimmed) return

  const pedido = linhaPedidoIndex.get(linhaKey)
  const status = classificarStatusIndenizado(pedido, etapas, appData)
  if (!status) return

  map.set(linhaKey, {
    linhaKey,
    data: dataTrimmed,
    valorIndenizado,
    nip: nipKey,
    status,
    ...(pedido ? { pedidoId: pedido.id } : {}),
  })
}

/** Coleta linhas com valor da coluna % A INDENIZAR, classificadas por etapa IMH. */
export function coletarLinhasTotalIndenizado(data: AppData): TotalIndenizadoLinha[] {
  const map = new Map<string, TotalIndenizadoLinha>()
  const excluidos = buildExclusoesDevolucao(data)
  const linhaPedidoIndex = buildLinhaPedidoIndex(data)
  const etapas = data.workflowEtapas ?? []

  for (const [clinicaId, consumo] of Object.entries(data.consumoPlanilha ?? {})) {
    const abasExtras = Array.isArray(consumo.abasExtras) ? consumo.abasExtras : []
    const rows: ConsumoMaterialRow[] = normalizeConsumoMaterialRows([
      ...(Array.isArray(consumo.extraRows) ? consumo.extraRows : []),
      ...abasExtras.flatMap((aba) => (Array.isArray(aba?.extraRows) ? aba.extraRows : [])),
    ])
    for (const row of rows) {
      registrarLinha(map, {
        clinicaId,
        linhaId: row.id,
        data: row.data,
        nip: row.nip,
        valorIndenizado: linhaConsumoIndenizado(row),
        excluidos,
        linhaPedidoIndex,
        etapas,
        appData: data,
      })
    }
  }

  for (const [clinicaId, raw] of Object.entries(data.planilhasLivres ?? {})) {
    const consumoRows = normalizeConsumoMaterialRows(raw?.consumoMaterialConsignado)
    const imhMedicamento = normalizeImhMedicamentoForm(raw?.imhMedicamento)
    const imh = normalizeImhAbaForm(raw?.imh)

    for (const row of consumoRows) {
      registrarLinha(map, {
        clinicaId,
        linhaId: row.id,
        data: row.data,
        nip: row.nip,
        valorIndenizado: linhaConsumoIndenizado(row),
        excluidos,
        linhaPedidoIndex,
        etapas,
        appData: data,
      })
    }

    for (const linha of imhMedicamento.linhas) {
      registrarLinha(map, {
        clinicaId,
        linhaId: linha.id,
        data: linha.data,
        nip: linha.nip,
        valorIndenizado: linhaMedicamentoIndenizado(linha),
        excluidos,
        linhaPedidoIndex,
        etapas,
        appData: data,
      })
    }

    for (const linha of imh.linhas) {
      registrarLinha(map, {
        clinicaId,
        linhaId: linha.id,
        data: linha.data,
        nip: linha.nip,
        valorIndenizado: linhaImhAbaIndenizado(linha),
        excluidos,
        linhaPedidoIndex,
        etapas,
        appData: data,
      })
    }
  }

  // Pedidos em Auditoria/Contabilidade: garante o valor do fluxo mesmo se a linha
  // individual falhar filtros (NIP/data) — espelha o card da timeline.
  for (const pedido of data.pedidos) {
    const status = classificarStatusIndenizado(pedido, etapas, data)
    if (!status) continue
    const jaTem = [...map.values()].some((l) => l.pedidoId === pedido.id)
    if (jaTem) continue
    const valor = somarPctIndenizarDoPedido(data, pedido)
    if (valor <= 0) continue
    const dataPedido = (() => {
      const iso = pedido.dataSolicitacao?.trim()
      if (!iso) return ''
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return ''
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
    })()
    if (!dataPedido) continue
    const linhaKey = `pedido:${pedido.id}:indenizar`
    map.set(linhaKey, {
      linhaKey,
      data: dataPedido,
      valorIndenizado: valor,
      nip: nipOuLinhaKey(pedido.paciente?.nip, pedido.id),
      status,
      pedidoId: pedido.id,
    })
  }

  return [...map.values()]
}

export function separarLinhasIndenizadoPorStatus(
  linhas: TotalIndenizadoLinha[],
): LinhasIndenizadoPorStatus {
  const aIndenizar: TotalIndenizadoLinha[] = []
  const indenizado: TotalIndenizadoLinha[] = []
  for (const linha of linhas) {
    if (linha.status === 'indenizado') indenizado.push(linha)
    else aIndenizar.push(linha)
  }
  return { aIndenizar, indenizado }
}

export function calcularTotalIndenizado(
  linhas: TotalIndenizadoLinha[],
  filtro: TotalIndenizadoFiltro,
): number {
  let total = 0
  for (const linha of linhas) {
    const data = parseIsoOrBrDate(linha.data)
    if (!data || !dateMatchesBalancoPeriodo(data, filtro.tipo, filtro.referencia)) continue
    total += linha.valorIndenizado
  }
  return total
}

/** Linhas cuja data cai no período (dia/mês/ano) informado. */
export function filtrarLinhasTotalIndenizado(
  linhas: TotalIndenizadoLinha[],
  filtro: TotalIndenizadoFiltro,
): TotalIndenizadoLinha[] {
  return linhas.filter((linha) => {
    const data = parseIsoOrBrDate(linha.data)
    if (!data) return false
    return dateMatchesBalancoPeriodo(data, filtro.tipo, filtro.referencia)
  })
}

export function formatTotalIndenizadoPeriodoLabel(
  tipo: TotalIndenizadoPeriodoTipo,
  referencia: Date,
): string {
  const d = referencia
  if (tipo === 'dia') {
    return d.toLocaleDateString('pt-BR')
  }
  if (tipo === 'mes') {
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return String(d.getFullYear())
}
