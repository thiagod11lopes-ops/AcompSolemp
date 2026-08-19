import type { AppData, ImhAbaLinha, ImhMedicamentoLinha } from '@/types'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import {
  calcValorIndenizar,
  parseValorBrasileiro,
} from '@/utils/consumoMaterialOds'
import { dateMatchesBalancoPeriodo, type BalancoPeriodoTipo } from '@/utils/medicamentoBalanco'
import { normalizePacienteNipKey } from '@/utils/pacientesPme'

export type TotalIndenizadoPeriodoTipo = BalancoPeriodoTipo

export interface TotalIndenizadoLinha {
  /** Chave única para deduplicação entre fontes */
  linhaKey: string
  data: string
  valorIndenizado: number
  nip: string
}

export interface TotalIndenizadoFiltro {
  tipo: TotalIndenizadoPeriodoTipo
  referencia: Date
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

function valorIndenizadoFromParts(total: number, pctRaw: string, valorIndenizarRaw?: string): number {
  const direto = parseValorBrasileiro(valorIndenizarRaw ?? '')
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

function linhaMedicamentoIndenizado(linha: ImhMedicamentoLinha): number {
  const total = parseValorBrasileiro(linha.total)
  return valorIndenizadoFromParts(total, linha.pctIndenizar, linha.valorIndenizar)
}

function parseQtdConsumo(raw: string | undefined | null): number {
  const cleaned = (raw ?? '').trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function linhaConsumoIndenizado(row: ConsumoMaterialRow): number {
  const total =
    row.valorNumerico > 0
      ? row.valorNumerico
      : parseValorBrasileiro(row.valor) ||
        parseValorBrasileiro(row.valorUnitario) * parseQtdConsumo(row.qtd)
  return valorIndenizadoFromParts(total, row.pctIndenizar, row.valorIndenizar)
}

function linhaImhAbaIndenizado(linha: ImhAbaLinha): number {
  const total = parseValorBrasileiro(linha.valorTotal)
  return valorIndenizadoFromParts(total, linha.pctIndenizar)
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

function registrarLinha(
  map: Map<string, TotalIndenizadoLinha>,
  params: {
    clinicaId: string
    linhaId: string
    data: string
    nip: string
    valorIndenizado: number
    excluidos: Set<string>
  },
): void {
  const { clinicaId, linhaId, data, nip, valorIndenizado, excluidos } = params
  const linhaKey = `${clinicaId}:${linhaId}`
  if (excluidos.has(linhaKey)) return
  const nipKey = nipContabilizavel(nip)
  if (!nipKey || valorIndenizado <= 0) return
  if (!data.trim()) return

  map.set(linhaKey, {
    linhaKey,
    data: data.trim(),
    valorIndenizado,
    nip: nipKey,
  })
}

/** Coleta todas as linhas indenizáveis de planilhas medicamento e OPME (sem filtro de período). */
export function coletarLinhasTotalIndenizado(data: AppData): TotalIndenizadoLinha[] {
  const map = new Map<string, TotalIndenizadoLinha>()
  const excluidos = buildExclusoesDevolucao(data)

  for (const [clinicaId, consumo] of Object.entries(data.consumoPlanilha ?? {})) {
    const rows: ConsumoMaterialRow[] = [
      ...(consumo.extraRows ?? []),
      ...(consumo.abasExtras ?? []).flatMap((aba) => aba.extraRows ?? []),
    ]
    for (const row of rows) {
      registrarLinha(map, {
        clinicaId,
        linhaId: row.id,
        data: row.data,
        nip: row.nip,
        valorIndenizado: linhaConsumoIndenizado(row),
        excluidos,
      })
    }
  }

  for (const [clinicaId, state] of Object.entries(data.planilhasLivres ?? {})) {
    for (const row of state.consumoMaterialConsignado ?? []) {
      registrarLinha(map, {
        clinicaId,
        linhaId: row.id,
        data: row.data,
        nip: row.nip,
        valorIndenizado: linhaConsumoIndenizado(row),
        excluidos,
      })
    }

    for (const linha of state.imhMedicamento?.linhas ?? []) {
      registrarLinha(map, {
        clinicaId,
        linhaId: linha.id,
        data: linha.data,
        nip: linha.nip,
        valorIndenizado: linhaMedicamentoIndenizado(linha),
        excluidos,
      })
    }

    for (const linha of state.imh?.linhas ?? []) {
      registrarLinha(map, {
        clinicaId,
        linhaId: linha.id,
        data: linha.data,
        nip: linha.nip,
        valorIndenizado: linhaImhAbaIndenizado(linha),
        excluidos,
      })
    }
  }

  return [...map.values()]
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
