import catalogData from '@/data/consumoMaterialCatalog.json'
import seedData from '@/data/consumoMaterialSeed.json'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'

export interface CatalogoReferenciaRow {
  diagnostico: string
  cid: string
  procedimento: string
  material: string
}

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

export const CATALOGO_REFERENCIA: CatalogoReferenciaRow[] = catalogData

export const CONSUMO_MATERIAL_SEED: ConsumoMaterialRow[] = seedData as ConsumoMaterialRow[]

export const CONSUMO_PLANILHA_NOME_PADRAO = 'Modelos OPME TRO — Jan-Jun/2026'

export function getConsumoMaterialInicial(): ConsumoMaterialRow[] {
  return CONSUMO_MATERIAL_SEED.map((row) => ({ ...row }))
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
  return row.id.startsWith('slot-')
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
