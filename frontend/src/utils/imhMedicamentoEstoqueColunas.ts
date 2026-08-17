import type {
  ImhMedicamentoLinha,
  ListaMedicamentoMovimentacao,
  ListaMedicamentosFormData,
} from '@/types'
import { IMH_MEDICAMENTO_COLUNAS } from '@/utils/imhMedicamentoForm'
import {
  parseListaMedQtdNumber,
  resolveListaMedicamentoEstoque,
} from '@/utils/listaMedicamentosForm'

export const IMH_MESES_NOMES = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
] as const

export type ImhEstoqueColunaKey =
  | 'balancoFinalAnterior'
  | 'entradasPaiol'
  | 'outrasEntradas'
  | 'outrasSaidas'
  | 'saidasPaciente'

export interface ImhEstoqueColunaDef {
  key: ImhEstoqueColunaKey | (typeof IMH_MEDICAMENTO_COLUNAS)[number]['key']
  label: string
  width: number
  computed?: boolean
}

export interface ImhEstoqueResumoColunas {
  balancoFinalAnterior: string
  entradasPaiol: string
  outrasEntradas: string
  outrasSaidas: string
  saidasPaciente: string
}

export function mesAnteriorImh(mes: number): number {
  const n = Number.isFinite(mes) ? Math.min(12, Math.max(1, Math.round(mes))) : new Date().getMonth() + 1
  return n === 1 ? 12 : n - 1
}

export function labelBalancoFinalMesAnterior(mesReferencia: number): string {
  return `Balanço Final ${IMH_MESES_NOMES[mesAnteriorImh(mesReferencia) - 1]}`
}

export function getImhMedicamentoColunasExibicao(mesReferencia: number): ImhEstoqueColunaDef[] {
  const idx = IMH_MEDICAMENTO_COLUNAS.findIndex((col) => col.key === 'total')
  const before = IMH_MEDICAMENTO_COLUNAS.slice(0, idx + 1)
  const after = IMH_MEDICAMENTO_COLUNAS.slice(idx + 1)
  const extra: ImhEstoqueColunaDef[] = [
    { key: 'balancoFinalAnterior', label: labelBalancoFinalMesAnterior(mesReferencia), width: 150, computed: true },
    { key: 'entradasPaiol', label: 'Entradas Paiol', width: 120, computed: true },
    { key: 'outrasEntradas', label: 'Outras Entradas', width: 120, computed: true },
    { key: 'outrasSaidas', label: 'Outras Saídas', width: 110, computed: true },
    { key: 'saidasPaciente', label: 'Saídas para Paciente', width: 140, computed: true },
  ]
  return [...before, ...extra, ...after]
}

function parseImhFlexDate(raw: string): Date | null {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  let year = Number(match[3])
  if (match[3].length === 2) year += 2000
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  date.setHours(0, 0, 0, 0)
  return date
}

function formatQtdEstoque(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}

function normKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function isPaiol(origemDestino: string): boolean {
  return normKey(origemDestino).includes('PAIOL')
}

function dataNoMes(date: Date, mes: number, ano: number): boolean {
  return date.getMonth() + 1 === mes && date.getFullYear() === ano
}

function dataAposFimMesAnterior(date: Date, mes: number, ano: number): boolean {
  const inicioMes = new Date(ano, mes - 1, 1)
  inicioMes.setHours(0, 0, 0, 0)
  return date.getTime() >= inicioMes.getTime()
}

export function chaveEstoqueImhLinha(linha: ImhMedicamentoLinha): string {
  if (linha.listaMedicamentoId?.trim()) return `id:${linha.listaMedicamentoId.trim()}`
  return `nome:${normKey(linha.itemPme)}|lote:${normKey(linha.lote)}`
}

function mesmaLinhaEstoque(imh: ImhMedicamentoLinha, other: ImhMedicamentoLinha): boolean {
  if (imh.listaMedicamentoId?.trim() && other.listaMedicamentoId?.trim()) {
    return imh.listaMedicamentoId.trim() === other.listaMedicamentoId.trim()
  }
  return chaveEstoqueImhLinha(imh) === chaveEstoqueImhLinha(other)
}

function qtdLancamentoPaciente(linha: ImhMedicamentoLinha): number {
  const raw = (linha.estoqueQtdMovida?.trim() || linha.qtd).trim()
  return parseListaMedQtdNumber(raw)
}

export function resumoEstoqueImhColunas(
  linha: ImhMedicamentoLinha,
  lista: ListaMedicamentosFormData | undefined,
  todasImh: ImhMedicamentoLinha[],
  mes: number,
  ano: number,
): ImhEstoqueResumoColunas {
  const empty: ImhEstoqueResumoColunas = {
    balancoFinalAnterior: '—',
    entradasPaiol: '—',
    outrasEntradas: '—',
    outrasSaidas: '—',
    saidasPaciente: '—',
  }
  if (!linha.itemPme.trim() && !linha.listaMedicamentoId?.trim()) return empty

  const estoque = resolveListaMedicamentoEstoque(
    lista,
    linha.itemPme,
    linha.lote,
    linha.listaMedicamentoId,
  )
  const movs: ListaMedicamentoMovimentacao[] = estoque?.movimentacoes ?? []

  let entradasPaiol = 0
  let outrasEntradas = 0
  let outrasSaidas = 0
  let entradasAposMesAnterior = 0
  let saidasManuaisAposMesAnterior = 0

  for (const mov of movs) {
    const data = parseImhFlexDate(mov.data)
    if (!data) continue
    const qtd = parseListaMedQtdNumber(mov.qtd)
    if (qtd <= 0) continue
    const noMes = dataNoMes(data, mes, ano)
    const aposAnterior = dataAposFimMesAnterior(data, mes, ano)

    if (mov.tipo === 'entrada') {
      if (aposAnterior) entradasAposMesAnterior += qtd
      if (noMes) {
        if (isPaiol(mov.origemDestino)) entradasPaiol += qtd
        else outrasEntradas += qtd
      }
    } else {
      if (aposAnterior) saidasManuaisAposMesAnterior += qtd
      if (noMes) outrasSaidas += qtd
    }
  }

  let saidasPacienteMes = 0
  let saidasPacienteAposMesAnterior = 0
  for (const imh of todasImh) {
    if (!mesmaLinhaEstoque(linha, imh)) continue
    const data = parseImhFlexDate(imh.data)
    if (!data) continue
    const qtd = qtdLancamentoPaciente(imh)
    if (qtd <= 0) continue
    if (dataNoMes(data, mes, ano)) saidasPacienteMes += qtd
    if (dataAposFimMesAnterior(data, mes, ano)) saidasPacienteAposMesAnterior += qtd
  }

  const qtdAtual = estoque ? parseListaMedQtdNumber(estoque.qtd) : 0
  const balancoFinalAnterior =
    qtdAtual - entradasAposMesAnterior + saidasManuaisAposMesAnterior + saidasPacienteAposMesAnterior

  if (!estoque && saidasPacienteMes === 0 && entradasPaiol === 0 && outrasEntradas === 0 && outrasSaidas === 0) {
    return empty
  }

  return {
    balancoFinalAnterior: formatQtdEstoque(balancoFinalAnterior),
    entradasPaiol: formatQtdEstoque(entradasPaiol),
    outrasEntradas: formatQtdEstoque(outrasEntradas),
    outrasSaidas: formatQtdEstoque(outrasSaidas),
    saidasPaciente: formatQtdEstoque(saidasPacienteMes),
  }
}

export function valorCelulaImhExibicao(
  col: ImhEstoqueColunaDef,
  linha: ImhMedicamentoLinha,
  resumo: ImhEstoqueResumoColunas | undefined,
): string {
  if (col.computed) {
    return resumo?.[col.key as ImhEstoqueColunaKey] ?? '—'
  }
  return String(linha[col.key as keyof ImhMedicamentoLinha] ?? '')
}
