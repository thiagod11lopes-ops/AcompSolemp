import { endOfDay, format, isValid, parseISO, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  DashboardEmpenhadoItem,
  DashboardMetrics,
  DashboardPedidoItem,
  EmpenhadoMesTotal,
} from '@/types'
import type { TotalIndenizadoLinha } from '@/utils/totalIndenizado'

export interface GestorBalancoPeriodo {
  dataInicio: string
  dataFim: string
}

export interface GestorBalancoKpis {
  totalProcessos: number
  emAndamento: number
  concluidos: number
  atrasados: number
  proximosVencimento: number
  valorEmpenhado: number
  quantidadeEmpenhado: number
  valorIndenizado: number
  valorASerIndenizado: number
  valorAguardandoEmpenho: number
  quantidadeAguardandoEmpenho: number
  tempoMedioConclusaoDias: number | null
}

export interface GestorBalancoSerieMes {
  mesChave: string
  mesLabel: string
  processos: number
  concluidos: number
  valorEmpenhado: number
  qtdEmpenhado: number
  valorIndenizado: number
}

export interface GestorBalancoRanking {
  nome: string
  total: number
  valor: number
}

export interface GestorBalancoResult {
  periodoLabel: string
  kpis: GestorBalancoKpis
  serieMensal: GestorBalancoSerieMes[]
  statusDistribuicao: { name: string; value: number; color: string }[]
  empenhoPorMes: EmpenhadoMesTotal[]
  rankingClinicas: GestorBalancoRanking[]
  rankingEmpresas: GestorBalancoRanking[]
  gargalos: { etapa: string; quantidade: number; valor: number }[]
  processosFiltrados: DashboardPedidoItem[]
  empenhadosFiltrados: DashboardEmpenhadoItem[]
}

function parseDay(iso: string): Date | null {
  if (!iso?.trim()) return null
  const d = parseISO(iso.trim().slice(0, 10))
  return isValid(d) ? d : null
}

function inPeriod(isoDate: string | null | undefined, inicio: Date | null, fim: Date | null): boolean {
  if (!isoDate) return false
  const raw = isoDate.trim()
  const d = parseDay(raw.includes('T') ? raw : raw.slice(0, 10))
  if (!d || !isValid(d)) return false
  if (inicio && d < inicio) return false
  if (fim && d > fim) return false
  return true
}

/** Aceita ISO ou dd/MM/yyyy */
function inPeriodFlexible(raw: string | null | undefined, inicio: Date | null, fim: Date | null): boolean {
  if (!raw?.trim()) return false
  const trimmed = raw.trim()
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (br) {
    const day = parseInt(br[1], 10)
    const month = parseInt(br[2], 10) - 1
    let year = parseInt(br[3], 10)
    if (year < 100) year += 2000
    const d = new Date(year, month, day)
    if (!isValid(d)) return false
    if (inicio && d < inicio) return false
    if (fim && d > fim) return false
    return true
  }
  return inPeriod(trimmed, inicio, fim)
}

function mesChaveFromIso(iso: string): string {
  const d = parseDay(iso)
  return d ? format(d, 'yyyy-MM') : '????-??'
}

function mesLabelFromChave(chave: string): string {
  const [y, m] = chave.split('-').map(Number)
  if (!y || !m) return chave
  const d = new Date(y, m - 1, 1)
  return format(d, 'MMM/yyyy', { locale: ptBR })
}

function aggregateRanking(itens: DashboardPedidoItem[]): GestorBalancoRanking[] {
  const map = new Map<string, GestorBalancoRanking>()
  for (const item of itens) {
    const nome = item.clinicaNome || '—'
    const cur = map.get(nome) ?? { nome, total: 0, valor: 0 }
    cur.total += 1
    cur.valor += item.valor || 0
    map.set(nome, cur)
  }
  return [...map.values()].sort((a, b) => b.valor - a.valor || b.total - a.total).slice(0, 8)
}

function aggregateEmpresas(itens: DashboardPedidoItem[]): GestorBalancoRanking[] {
  const map = new Map<string, GestorBalancoRanking>()
  for (const item of itens) {
    const nome = item.empresaNome || '—'
    const cur = map.get(nome) ?? { nome, total: 0, valor: 0 }
    cur.total += 1
    cur.valor += item.valor || 0
    map.set(nome, cur)
  }
  return [...map.values()].sort((a, b) => b.valor - a.valor || b.total - a.total).slice(0, 8)
}

export function formatGestorBalancoPeriodoLabel(periodo: GestorBalancoPeriodo): string {
  const ini = parseDay(periodo.dataInicio)
  const fim = parseDay(periodo.dataFim)
  const a = ini ? format(ini, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : periodo.dataInicio
  const b = fim ? format(fim, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : periodo.dataFim
  return `${a} — ${b}`
}

export function buildGestorBalanco(
  metrics: DashboardMetrics,
  periodo: GestorBalancoPeriodo,
): GestorBalancoResult {
  const inicio = periodo.dataInicio ? startOfDay(parseISO(periodo.dataInicio)) : null
  const fim = periodo.dataFim ? endOfDay(parseISO(periodo.dataFim)) : null
  const inicioOk = inicio && isValid(inicio) ? inicio : null
  const fimOk = fim && isValid(fim) ? fim : null

  const processosFiltrados = metrics.todosItens.filter((p) =>
    inPeriod(p.dataSolicitacao, inicioOk, fimOk),
  )
  const empenhadosFiltrados = metrics.empenhadoItens.filter((e) =>
    inPeriod(e.dataEmpenho, inicioOk, fimOk),
  )
  const indenizadoFiltrado = metrics.totalIndenizadoLinhas.filter((l) =>
    inPeriodFlexible(l.data, inicioOk, fimOk),
  )
  const aSerIndenizadoFiltrado = metrics.valorASerIndenizadoLinhas.filter((l) =>
    inPeriodFlexible(l.data, inicioOk, fimOk),
  )
  const aguardandoFiltrado = metrics.aguardandoEmpenhoItens.filter((a) =>
    inPeriod(a.dataSolicitacao, inicioOk, fimOk),
  )

  const emAndamento = processosFiltrados.filter((p) => !p.concluido)
  const concluidos = processosFiltrados.filter((p) => p.concluido)
  const atrasados = processosFiltrados.filter((p) => !p.concluido && p.prazoStatus === 'ATRASADO')
  const proximos = processosFiltrados.filter(
    (p) => !p.concluido && p.prazoStatus === 'PROXIMO_VENCIMENTO',
  )

  const diasConclusao = concluidos
    .map((p) => p.diasAteConclusao)
    .filter((d): d is number => typeof d === 'number' && Number.isFinite(d) && d >= 0)
  const tempoMedioConclusaoDias =
    diasConclusao.length > 0
      ? Math.round((diasConclusao.reduce((s, d) => s + d, 0) / diasConclusao.length) * 10) / 10
      : null

  const mesMap = new Map<string, GestorBalancoSerieMes>()
  const ensureMes = (chave: string) => {
    let row = mesMap.get(chave)
    if (!row) {
      row = {
        mesChave: chave,
        mesLabel: mesLabelFromChave(chave),
        processos: 0,
        concluidos: 0,
        valorEmpenhado: 0,
        qtdEmpenhado: 0,
        valorIndenizado: 0,
      }
      mesMap.set(chave, row)
    }
    return row
  }

  for (const p of processosFiltrados) {
    const chave = mesChaveFromIso(p.dataSolicitacao)
    const row = ensureMes(chave)
    row.processos += 1
    if (p.concluido) row.concluidos += 1
  }
  for (const e of empenhadosFiltrados) {
    const chave = e.mesChave || mesChaveFromIso(e.dataEmpenho)
    const row = ensureMes(chave)
    row.valorEmpenhado += e.valor || 0
    row.qtdEmpenhado += 1
  }
  for (const l of indenizadoFiltrado) {
    const chave = mesChaveFromIso(normalizeIndenizadoDateToIso(l))
    if (chave.startsWith('?')) continue
    const row = ensureMes(chave)
    row.valorIndenizado += l.valorIndenizado || 0
  }

  const serieMensal = [...mesMap.values()].sort((a, b) => a.mesChave.localeCompare(b.mesChave))

  const empenhoPorMesMap = new Map<string, EmpenhadoMesTotal>()
  for (const e of empenhadosFiltrados) {
    const chave = e.mesChave || mesChaveFromIso(e.dataEmpenho)
    const cur = empenhoPorMesMap.get(chave) ?? {
      mesChave: chave,
      mesLabel: e.mesLabel || mesLabelFromChave(chave),
      valor: 0,
      quantidade: 0,
    }
    cur.valor += e.valor || 0
    cur.quantidade += 1
    empenhoPorMesMap.set(chave, cur)
  }
  const empenhoPorMes = [...empenhoPorMesMap.values()].sort((a, b) =>
    a.mesChave.localeCompare(b.mesChave),
  )

  const gargaloMap = new Map<string, { etapa: string; quantidade: number; valor: number }>()
  for (const p of emAndamento) {
    const etapa = p.etapasAtivasNomes || p.etapaAtual || '—'
    const cur = gargaloMap.get(etapa) ?? { etapa, quantidade: 0, valor: 0 }
    cur.quantidade += 1
    cur.valor += p.valor || 0
    gargaloMap.set(etapa, cur)
  }
  const gargalos = [...gargaloMap.values()]
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 10)

  const kpis: GestorBalancoKpis = {
    totalProcessos: processosFiltrados.length,
    emAndamento: emAndamento.length,
    concluidos: concluidos.length,
    atrasados: atrasados.length,
    proximosVencimento: proximos.length,
    valorEmpenhado: empenhadosFiltrados.reduce((s, e) => s + (e.valor || 0), 0),
    quantidadeEmpenhado: empenhadosFiltrados.length,
    valorIndenizado: indenizadoFiltrado.reduce((s, l) => s + (l.valorIndenizado || 0), 0),
    valorASerIndenizado: aSerIndenizadoFiltrado.reduce((s, l) => s + (l.valorIndenizado || 0), 0),
    valorAguardandoEmpenho: aguardandoFiltrado.reduce((s, a) => s + (a.valor || 0), 0),
    quantidadeAguardandoEmpenho: aguardandoFiltrado.length,
    tempoMedioConclusaoDias,
  }

  return {
    periodoLabel: formatGestorBalancoPeriodoLabel(periodo),
    kpis,
    serieMensal,
    statusDistribuicao: [
      { name: 'Em andamento', value: kpis.emAndamento, color: '#3B82F6' },
      { name: 'Concluídos', value: kpis.concluidos, color: '#22C55E' },
      { name: 'Atrasados', value: kpis.atrasados, color: '#EF4444' },
      { name: 'Próx. vencimento', value: kpis.proximosVencimento, color: '#F59E0B' },
    ].filter((d) => d.value > 0),
    empenhoPorMes,
    rankingClinicas: aggregateRanking(processosFiltrados),
    rankingEmpresas: aggregateEmpresas(processosFiltrados),
    gargalos,
    processosFiltrados,
    empenhadosFiltrados,
  }
}

function normalizeIndenizadoDateToIso(l: TotalIndenizadoLinha): string {
  const trimmed = l.data?.trim() ?? ''
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (br) {
    const day = parseInt(br[1], 10)
    const month = parseInt(br[2], 10)
    let year = parseInt(br[3], 10)
    if (year < 100) year += 2000
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return trimmed.slice(0, 10)
}
