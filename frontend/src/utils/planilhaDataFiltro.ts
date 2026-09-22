import {
  ANOS_PLANILHA_DISPONIVEIS,
  dataPertenceAoMes,
  getMesModeloFromParts,
  type MesConsumoModelo,
} from '@/utils/consumoMaterialTemplate'

/** Filtro Todos + Dia/Mês/Ano das planilhas IMH e Div. Material. */
export interface PlanilhaDataFiltro {
  mostrarTodos: boolean
  /** 0 = todos os dias do mês */
  dia: number
  /** 1–12 */
  mes: number
  ano: number
}

export function createDefaultPlanilhaDataFiltro(
  now = new Date(),
): PlanilhaDataFiltro {
  return {
    mostrarTodos: false,
    dia: 0,
    mes: now.getMonth() + 1,
    ano: now.getFullYear(),
  }
}

export function normalizePlanilhaDataFiltro(
  value: Partial<PlanilhaDataFiltro> | undefined | null,
): PlanilhaDataFiltro {
  const fallback = createDefaultPlanilhaDataFiltro()
  if (!value || typeof value !== 'object') return fallback
  const mes =
    typeof value.mes === 'number' && value.mes >= 1 && value.mes <= 12
      ? Math.floor(value.mes)
      : fallback.mes
  const ano =
    typeof value.ano === 'number' && Number.isFinite(value.ano) && value.ano > 1900
      ? Math.floor(value.ano)
      : fallback.ano
  const maxDia = diasNoMes(mes, ano)
  const diaRaw = typeof value.dia === 'number' ? Math.floor(value.dia) : 0
  const dia = diaRaw > 0 && diaRaw <= maxDia ? diaRaw : 0
  return {
    mostrarTodos: Boolean(value.mostrarTodos),
    dia,
    mes,
    ano,
  }
}

export function diasNoMes(mes: number, ano: number): number {
  return new Date(ano, mes, 0).getDate()
}

export function dataPertenceAoDia(
  data: string,
  dia: number,
  mesModelo: MesConsumoModelo,
): boolean {
  if (!dataPertenceAoMes(data, mesModelo)) return false
  if (dia <= 0) return true
  const match = data.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return false
  return parseInt(match[1], 10) === dia
}

export function mesModeloFromFiltro(filtro: PlanilhaDataFiltro): MesConsumoModelo {
  return getMesModeloFromParts(filtro.mes, filtro.ano)
}

export function linhaPassaNoFiltroData(
  data: string,
  filtro: PlanilhaDataFiltro,
): boolean {
  if (filtro.mostrarTodos) return true
  return dataPertenceAoDia(data, filtro.dia, mesModeloFromFiltro(filtro))
}

export function anosDisponiveisFromDatas(datas: string[]): number[] {
  const anos = new Set<number>(ANOS_PLANILHA_DISPONIVEIS)
  anos.add(new Date().getFullYear())
  for (const data of datas) {
    const match = data.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (!match) continue
    const yearRaw = match[3]
    const year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw, 10) : parseInt(yearRaw, 10)
    if (Number.isFinite(year)) anos.add(year)
  }
  return [...anos].sort((a, b) => b - a)
}

export const MESES_FILTRO_OPCOES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
] as const

export interface PlanilhaFiltrosPersistidos {
  imh?: PlanilhaDataFiltro
  divMaterial?: PlanilhaDataFiltro
}

export function normalizePlanilhaFiltrosPersistidos(
  value: PlanilhaFiltrosPersistidos | undefined | null,
): PlanilhaFiltrosPersistidos {
  return {
    imh: normalizePlanilhaDataFiltro(value?.imh),
    divMaterial: normalizePlanilhaDataFiltro(value?.divMaterial),
  }
}
