import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'
import type { MesConsumoModelo } from '@/utils/consumoMaterialTemplate'

export interface ImhCabecalho {
  numeroRelacao: string
  pregaoTad: string
  data: string
  vigencia: string
  processo: string
  fornecedor: string
}

export interface ImhLinha {
  id: string
  pacienteGrupoId: string
  isLinhaPaciente: boolean
  numero: string
  nip: string
  iniciais: string
  data: string
  procedimento: string
  mapaSala: string
  danfe: string
  item: string
  nebPi: string
  descricaoMaterial: string
  qt: string
  valorUnit: string
  valorTotal: string
  subtotalPaciente: string
}

export interface ImhPlanilha {
  cabecalho: ImhCabecalho
  linhas: ImhLinha[]
}

export const IMH_COLUNAS = [
  { key: 'numero', label: 'N°', width: 52 },
  { key: 'nip', label: 'NIP', width: 108 },
  { key: 'iniciais', label: 'INICIAIS', width: 80 },
  { key: 'data', label: 'DATA', width: 88 },
  { key: 'procedimento', label: 'PROCEDIMENTO', width: 220 },
  { key: 'mapaSala', label: 'Mapa de Sala', width: 96 },
  { key: 'danfe', label: 'DANFE', width: 72 },
  { key: 'item', label: 'ITEM', width: 56 },
  { key: 'nebPi', label: 'NEB/PI', width: 100 },
  { key: 'descricaoMaterial', label: 'DESCRIÇÃO DO MATERIAL', width: 280 },
  { key: 'qt', label: 'QT', width: 48 },
  { key: 'valorUnit', label: 'V. UNIT.', width: 100 },
  { key: 'valorTotal', label: 'V. TOTAL', width: 100 },
  { key: 'subtotalPaciente', label: 'SUBTOTAL', width: 110 },
] as const

export type ImhColunaKey = (typeof IMH_COLUNAS)[number]['key']

export const IMH_OBSERVACOES = [
  '1) O processo de renovação da licitação do material consignado deverá ser iniciado pelas respectivas clínicas, no mínimo, com 6 meses de antecedência.',
  '2) Em princípio, a data do procedimento não poderá ocorrer após da vigência do processo licitatório.',
] as const

export const IMH_ASSINATURAS = [
  'Chefe da Clínica',
  'Enc Consignado',
  'Ecônomo',
] as const

function formatDataHoje(): string {
  const d = new Date()
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

function mapaSalaFromRow(row: ConsumoMaterialRow): string {
  return row.mapaSala.trim() || row.mapa.trim()
}

export function buildImhPlanilhaFromConsumo(
  consumoRows: ConsumoMaterialRow[],
  mesReferencia?: MesConsumoModelo,
): ImhPlanilha {
  const primeira = consumoRows[0]
  const fornecedores = consumoRows.map((r) => r.fornecedor.trim()).filter(Boolean)
  const fornecedorPrincipal = fornecedores[0] ?? ''

  const cabecalho: ImhCabecalho = {
    numeroRelacao: mesReferencia
      ? `${String(mesReferencia.mes).padStart(2, '0')}/${mesReferencia.ano}`
      : '',
    pregaoTad: primeira?.ref.trim() ?? '',
    data: formatDataHoje(),
    vigencia: '',
    processo: '',
    fornecedor: fornecedorPrincipal,
  }

  const linhas: ImhLinha[] = []
  consumoRows.forEach((row, index) => {
    const valorFmt = row.valorNumerico > 0 ? formatValorBrasileiro(row.valorNumerico) : row.valor
    linhas.push({
      id: `imh-${row.id}-0`,
      pacienteGrupoId: row.id,
      isLinhaPaciente: true,
      numero: String(index + 1),
      nip: row.nip,
      iniciais: row.iniciais,
      data: row.data,
      procedimento: row.procedimento,
      mapaSala: mapaSalaFromRow(row),
      danfe: row.danfe,
      item: row.ata || String((index + 1) * 10),
      nebPi: row.safin || row.empenho,
      descricaoMaterial: row.materiais || row.procedimento,
      qt: '1',
      valorUnit: valorFmt,
      valorTotal: valorFmt,
      subtotalPaciente: valorFmt,
    })
  })

  return { cabecalho, linhas }
}

export function createImhLinhaPaciente(pacienteGrupoId?: string): ImhLinha {
  const grupoId = pacienteGrupoId ?? `paciente-${Date.now()}`
  return {
    id: `imh-${grupoId}-pac-${Date.now()}`,
    pacienteGrupoId: grupoId,
    isLinhaPaciente: true,
    numero: '',
    nip: '',
    iniciais: '',
    data: '',
    procedimento: '',
    mapaSala: '',
    danfe: '',
    item: '',
    nebPi: '',
    descricaoMaterial: '',
    qt: '1',
    valorUnit: '',
    valorTotal: '',
    subtotalPaciente: '',
  }
}

export function createImhLinhaMaterial(
  pacienteGrupoId: string,
  suffix: number,
): ImhLinha {
  return {
    id: `imh-${pacienteGrupoId}-mat-${suffix}-${Date.now()}`,
    pacienteGrupoId,
    isLinhaPaciente: false,
    numero: '',
    nip: '',
    iniciais: '',
    data: '',
    procedimento: '',
    mapaSala: '',
    danfe: '',
    item: '',
    nebPi: '',
    descricaoMaterial: '',
    qt: '1',
    valorUnit: '',
    valorTotal: '',
    subtotalPaciente: '',
  }
}

export function calcularTotalImh(linhas: ImhLinha[]): number {
  return linhas.reduce((sum, linha) => {
    const val = linha.valorTotal.replace(/[R$\s.]/g, '').replace(',', '.')
    const n = parseFloat(val)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)
}
