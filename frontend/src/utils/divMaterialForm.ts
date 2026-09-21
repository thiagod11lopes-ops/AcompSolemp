import type { ConmedComrjFormData, Empresa } from '@/types'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import { formatNip } from '@/utils/format'
import { normalizePacienteNipKey } from '@/utils/pacientesPme'

export interface DivMaterialLinha {
  id: string
  modalidadeLicitatoria: string
  uasg: string
  nupModalidade: string
  numeroItem: string
  descricaoMaterial: string
  nomePaciente: string
  nip: string
  mapa: string
  valeSala: string
  vigencia: string
  nupSigad: string
  fornecedor: string
  cnpj: string
  dataProcedimento: string
  anexoAtaHomologacao: string
  /** Chave estável nip|data|origem para overrides e dedupe */
  sourceKey: string
}

export type DivMaterialOverride = Partial<
  Pick<
    DivMaterialLinha,
    | 'modalidadeLicitatoria'
    | 'uasg'
    | 'nupModalidade'
    | 'numeroItem'
    | 'descricaoMaterial'
    | 'mapa'
    | 'valeSala'
    | 'vigencia'
    | 'nupSigad'
    | 'fornecedor'
    | 'cnpj'
    | 'anexoAtaHomologacao'
  >
>

export interface DivMaterialFormData {
  /** Overrides manuais (campos sem fonte automática ou correções) */
  overrides: Record<string, DivMaterialOverride>
}

export const EMPTY_DIV_MATERIAL_FORM: DivMaterialFormData = {
  overrides: {},
}

export const DIV_MATERIAL_COLUNAS = [
  { key: 'modalidadeLicitatoria', label: 'Modalidade licitatória', width: 140 },
  { key: 'uasg', label: 'UASG', width: 88 },
  { key: 'nupModalidade', label: 'NUP (modalidade)', width: 130 },
  { key: 'numeroItem', label: 'N° do item', width: 88 },
  { key: 'descricaoMaterial', label: 'Descrição do material', width: 220 },
  { key: 'nomePaciente', label: 'Nome do paciente', width: 180 },
  { key: 'nip', label: 'NIP', width: 108 },
  { key: 'mapa', label: 'Mapa', width: 100 },
  { key: 'valeSala', label: 'Vale de sala', width: 100 },
  { key: 'vigencia', label: 'Vigência', width: 100 },
  { key: 'nupSigad', label: 'NUP SIGAD', width: 120 },
  { key: 'fornecedor', label: 'Fornecedor', width: 140 },
  { key: 'cnpj', label: 'CNPJ', width: 130 },
  { key: 'dataProcedimento', label: 'Data do procedimento', width: 120 },
  {
    key: 'anexoAtaHomologacao',
    label: 'Em anexo a ata ou termo de homologação',
    width: 200,
  },
] as const

export type DivMaterialColunaKey = (typeof DIV_MATERIAL_COLUNAS)[number]['key']

const EDITABLE_KEYS = new Set<DivMaterialColunaKey>([
  'modalidadeLicitatoria',
  'uasg',
  'nupModalidade',
  'numeroItem',
  'descricaoMaterial',
  'mapa',
  'valeSala',
  'vigencia',
  'nupSigad',
  'fornecedor',
  'cnpj',
  'anexoAtaHomologacao',
])

export function isDivMaterialEditable(key: DivMaterialColunaKey): boolean {
  return EDITABLE_KEYS.has(key)
}

function normData(raw: string): string {
  return raw.trim()
}

function buildSourceKey(nip: string, data: string, originId: string): string {
  const nipKey = normalizePacienteNipKey(nip) || nip.trim().toLowerCase()
  return `${nipKey}|${normData(data)}|${originId}`
}

function resolveCnpj(fornecedor: string, empresas: Empresa[]): string {
  const nome = fornecedor.trim().toLowerCase()
  if (!nome) return ''
  const match = empresas.find(
    (e) =>
      e.razaoSocial.toLowerCase() === nome ||
      e.nomeFantasia.toLowerCase() === nome ||
      e.razaoSocial.toLowerCase().includes(nome) ||
      e.nomeFantasia.toLowerCase().includes(nome),
  )
  return match?.cnpj?.trim() ?? ''
}

function rowFromConsumo(
  row: ConsumoMaterialRow,
  conmed: ConmedComrjFormData | undefined,
  empresas: Empresa[],
): DivMaterialLinha | null {
  const nip = formatNip(row.nip.trim())
  const data = normData(row.data)
  if (!nip && !row.nome.trim() && !data) return null

  const fornecedor = row.fornecedor.trim() || conmed?.fornecedor?.trim() || ''
  return {
    id: `div-mat-consumo-${row.id}`,
    sourceKey: buildSourceKey(nip || row.nip, data, `consumo:${row.id}`),
    modalidadeLicitatoria: row.ref.trim() || conmed?.pregaoTad?.trim() || '',
    uasg: '',
    nupModalidade: conmed?.processo?.trim() || '',
    numeroItem: row.numero.trim(),
    descricaoMaterial: row.materiais.trim() || row.itemPme.trim(),
    nomePaciente: row.nome.trim(),
    nip: nip || row.nip.trim(),
    mapa: row.mapa.trim(),
    valeSala: row.mapaSala.trim(),
    vigencia: conmed?.vigencia?.trim() || '',
    nupSigad: '',
    fornecedor,
    cnpj: resolveCnpj(fornecedor, empresas),
    dataProcedimento: data,
    anexoAtaHomologacao: row.ata.trim(),
  }
}

function rowsFromConmed(
  conmed: ConmedComrjFormData | undefined,
  empresas: Empresa[],
  existingKeys: Set<string>,
): DivMaterialLinha[] {
  if (!conmed) return []
  const out: DivMaterialLinha[] = []
  for (const paciente of conmed.pacientes ?? []) {
    const nip = formatNip(paciente.nip.trim())
    const data = normData(paciente.data)
    const materiais = paciente.materiais ?? []
    if (materiais.length === 0) {
      const sourceKey = buildSourceKey(nip || paciente.nip, data, `conmed-pac:${paciente.id}`)
      if (existingKeys.has(sourceKey)) continue
      const fornecedor = conmed.fornecedor.trim()
      out.push({
        id: `div-mat-conmed-${paciente.id}`,
        sourceKey,
        modalidadeLicitatoria: conmed.pregaoTad.trim(),
        uasg: '',
        nupModalidade: conmed.processo.trim(),
        numeroItem: '',
        descricaoMaterial: paciente.procedimento.trim(),
        nomePaciente: paciente.iniciais.trim(),
        nip: nip || paciente.nip.trim(),
        mapa: '',
        valeSala: '',
        vigencia: conmed.vigencia.trim(),
        nupSigad: '',
        fornecedor,
        cnpj: resolveCnpj(fornecedor, empresas),
        dataProcedimento: data,
        anexoAtaHomologacao: '',
      })
      existingKeys.add(sourceKey)
      continue
    }
    for (const mat of materiais) {
      const sourceKey = buildSourceKey(nip || paciente.nip, data, `conmed-mat:${mat.id}`)
      if (existingKeys.has(sourceKey)) continue
      const fornecedor = conmed.fornecedor.trim()
      out.push({
        id: `div-mat-conmed-${mat.id}`,
        sourceKey,
        modalidadeLicitatoria: conmed.pregaoTad.trim(),
        uasg: '',
        nupModalidade: conmed.processo.trim(),
        numeroItem: mat.item.trim(),
        descricaoMaterial: mat.descricao.trim(),
        nomePaciente: paciente.iniciais.trim(),
        nip: nip || paciente.nip.trim(),
        mapa: '',
        valeSala: mat.mapaDaSala.trim(),
        vigencia: conmed.vigencia.trim(),
        nupSigad: '',
        fornecedor,
        cnpj: resolveCnpj(fornecedor, empresas),
        dataProcedimento: data,
        anexoAtaHomologacao: '',
      })
      existingKeys.add(sourceKey)
    }
  }
  return out
}

function applyOverride(linha: DivMaterialLinha, override?: DivMaterialOverride): DivMaterialLinha {
  if (!override) return linha
  return {
    ...linha,
    modalidadeLicitatoria: override.modalidadeLicitatoria ?? linha.modalidadeLicitatoria,
    uasg: override.uasg ?? linha.uasg,
    nupModalidade: override.nupModalidade ?? linha.nupModalidade,
    numeroItem: override.numeroItem ?? linha.numeroItem,
    descricaoMaterial: override.descricaoMaterial ?? linha.descricaoMaterial,
    mapa: override.mapa ?? linha.mapa,
    valeSala: override.valeSala ?? linha.valeSala,
    vigencia: override.vigencia ?? linha.vigencia,
    nupSigad: override.nupSigad ?? linha.nupSigad,
    fornecedor: override.fornecedor ?? linha.fornecedor,
    cnpj: override.cnpj ?? linha.cnpj,
    anexoAtaHomologacao: override.anexoAtaHomologacao ?? linha.anexoAtaHomologacao,
  }
}

/** Monta linhas da Div. Material a partir do Consumo + CONMED, diferenciando NIP iguais pela data. */
export function buildDivMaterialLinhas(input: {
  consumoRows: ConsumoMaterialRow[]
  conmed?: ConmedComrjFormData
  empresas?: Empresa[]
  form?: DivMaterialFormData
}): DivMaterialLinha[] {
  const empresas = input.empresas ?? []
  const overrides = input.form?.overrides ?? {}
  const existingKeys = new Set<string>()
  const linhas: DivMaterialLinha[] = []

  for (const row of input.consumoRows) {
    const built = rowFromConsumo(row, input.conmed, empresas)
    if (!built) continue
    if (!built.nip.trim() && !built.dataProcedimento.trim()) continue
    existingKeys.add(built.sourceKey)
    linhas.push(applyOverride(built, overrides[built.sourceKey]))
  }

  for (const built of rowsFromConmed(input.conmed, empresas, existingKeys)) {
    if (!built.nip.trim() && !built.dataProcedimento.trim()) continue
    linhas.push(applyOverride(built, overrides[built.sourceKey]))
  }

  return linhas.sort((a, b) => {
    const nipCmp = a.nip.localeCompare(b.nip, 'pt-BR')
    if (nipCmp !== 0) return nipCmp
    const dataCmp = a.dataProcedimento.localeCompare(b.dataProcedimento, 'pt-BR')
    if (dataCmp !== 0) return dataCmp
    return a.nomePaciente.localeCompare(b.nomePaciente, 'pt-BR')
  })
}

export function normalizeDivMaterialForm(
  value: DivMaterialFormData | undefined,
): DivMaterialFormData {
  const overridesRaw = value?.overrides
  if (!overridesRaw || typeof overridesRaw !== 'object') {
    return { overrides: {} }
  }
  const overrides: Record<string, DivMaterialOverride> = {}
  for (const [key, raw] of Object.entries(overridesRaw)) {
    if (!raw || typeof raw !== 'object') continue
    overrides[key] = { ...raw }
  }
  return { overrides }
}

export function setDivMaterialOverride(
  form: DivMaterialFormData,
  sourceKey: string,
  field: keyof DivMaterialOverride,
  value: string,
): DivMaterialFormData {
  return {
    overrides: {
      ...form.overrides,
      [sourceKey]: {
        ...form.overrides[sourceKey],
        [field]: value,
      },
    },
  }
}
