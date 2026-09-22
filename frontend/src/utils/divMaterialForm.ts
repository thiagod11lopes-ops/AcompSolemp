import type { ConmedComrjFormData, Empresa } from '@/types'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import {
  CONTROLE_SOLEMP_DIVISAO_PADRAO,
  type ControleSolempPlanilha,
} from '@/utils/controleSolempTemplate'
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
  /** Chave estável nip|data|origem */
  sourceKey: string
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

function normData(raw: string): string {
  return raw.trim()
}

function buildSourceKey(nip: string, data: string, originId: string): string {
  const nipKey = normalizePacienteNipKey(nip) || nip.trim().toLowerCase()
  return `${nipKey}|${normData(data)}|${originId}`
}

function extractCnpjFromText(raw: string): string {
  const match = raw.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/)
  if (!match) return ''
  const digits = match[0].replace(/\D/g, '')
  if (digits.length !== 14) return match[0].trim()
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function resolveCnpj(fornecedor: string, empresas: Empresa[]): string {
  const fromText = extractCnpjFromText(fornecedor)
  if (fromText) return fromText
  const nome = fornecedor
    .replace(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, '')
    .replace(/[–—-]/g, ' ')
    .trim()
    .toLowerCase()
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

  const fornecedorRaw = row.fornecedor.trim() || conmed?.fornecedor?.trim() || ''
  const fornecedor =
    fornecedorRaw.replace(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, '').replace(/[–—-]/g, ' ').trim() ||
    fornecedorRaw
  // Mapa de Sala → Vale de sala; coluna Mapa fica vazia (sem fonte no MODELO).
  const valeSala = row.mapaSala.trim() || row.mapa.trim()
  return {
    id: `div-mat-consumo-${row.id}`,
    sourceKey: buildSourceKey(nip || row.nip, data, `consumo:${row.id}`),
    modalidadeLicitatoria: row.ref.trim() || conmed?.pregaoTad?.trim() || '',
    uasg: '',
    nupModalidade: conmed?.processo?.trim() || '',
    numeroItem: row.numero.trim(),
    descricaoMaterial: row.materiais.trim() || row.itemPme.trim(),
    nomePaciente: row.nome.trim() || row.iniciais.trim(),
    nip: nip || row.nip.trim(),
    mapa: '',
    valeSala,
    vigencia: conmed?.vigencia?.trim() || '',
    nupSigad: '',
    fornecedor,
    cnpj: resolveCnpj(fornecedorRaw, empresas),
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
      const fornecedorRaw = conmed.fornecedor.trim()
      const fornecedor =
        fornecedorRaw
          .replace(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, '')
          .replace(/[–—-]/g, ' ')
          .trim() || fornecedorRaw
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
        cnpj: resolveCnpj(fornecedorRaw, empresas),
        dataProcedimento: data,
        anexoAtaHomologacao: '',
      })
      existingKeys.add(sourceKey)
      continue
    }
    for (const mat of materiais) {
      const sourceKey = buildSourceKey(nip || paciente.nip, data, `conmed-mat:${mat.id}`)
      if (existingKeys.has(sourceKey)) continue
      const fornecedorRaw = conmed.fornecedor.trim()
      const fornecedor =
        fornecedorRaw
          .replace(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, '')
          .replace(/[–—-]/g, ' ')
          .trim() || fornecedorRaw
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
        cnpj: resolveCnpj(fornecedorRaw, empresas),
        dataProcedimento: data,
        anexoAtaHomologacao: '',
      })
      existingKeys.add(sourceKey)
    }
  }
  return out
}

/** Espelho somente leitura: Consumo + CONMED, diferenciando NIP iguais pela data. */
export function buildDivMaterialLinhas(input: {
  consumoRows: ConsumoMaterialRow[]
  conmed?: ConmedComrjFormData
  empresas?: Empresa[]
}): DivMaterialLinha[] {
  const empresas = input.empresas ?? []
  const existingKeys = new Set<string>()
  const linhas: DivMaterialLinha[] = []

  for (const row of input.consumoRows) {
    const built = rowFromConsumo(row, input.conmed, empresas)
    if (!built) continue
    if (!built.nip.trim() && !built.dataProcedimento.trim()) continue
    existingKeys.add(built.sourceKey)
    linhas.push(built)
  }

  for (const built of rowsFromConmed(input.conmed, empresas, existingKeys)) {
    if (!built.nip.trim() && !built.dataProcedimento.trim()) continue
    linhas.push(built)
  }

  return linhas.sort((a, b) => {
    const nipCmp = a.nip.localeCompare(b.nip, 'pt-BR')
    if (nipCmp !== 0) return nipCmp
    const dataCmp = a.dataProcedimento.localeCompare(b.dataProcedimento, 'pt-BR')
    if (dataCmp !== 0) return dataCmp
    return a.nomePaciente.localeCompare(b.nomePaciente, 'pt-BR')
  })
}

export function divMaterialLinhasToPedidoInput(
  linhas: DivMaterialLinha[],
  clinicaNome: string,
): import('@/services/clinicaPedidoService').CreatePedidoInput {
  if (linhas.length === 1) {
    const linha = linhas[0]
    return {
      consumoRowIds: [linha.id],
      paciente: {
        nome: linha.nomePaciente.trim() || '—',
        vinculo: 'TITULAR',
        nip: linha.nip.trim() || '—',
        nipTitular: linha.nip.trim() || '—',
        nomeTitular: linha.nomePaciente.trim() || '—',
        tipoUsuario: 'MILITAR',
      },
      dadosClinica: {
        nomeClinica: clinicaNome,
        medico: '—',
        procedimento: linha.descricaoMaterial.trim() || 'Div. Material',
        dataCirurgia: new Date().toISOString().slice(0, 10),
        empresaConsignada: linha.fornecedor.trim() || '—',
        pregao: linha.modalidadeLicitatoria.trim() || '—',
        materialUtilizado: linha.descricaoMaterial.trim() || 'Div. Material',
        quantidade: 1,
        valorUnitario: 0.01,
        valorTotal: 0.01,
        folhaSala: [linha.mapa, linha.valeSala].filter(Boolean).join(' / '),
        descricaoCirurgica: `Envio Div. Material para Confecção de Solemp — ${linha.nomePaciente.trim() || 'paciente'}.`,
        etiquetas: '',
        fotos: [],
      },
    }
  }

  const titulo = `Div. Material — ${linhas.length} lançamentos`
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
      procedimento: `Lote Div. Material com ${linhas.length} lançamentos`,
      dataCirurgia: new Date().toISOString().slice(0, 10),
      empresaConsignada: linhas.find((l) => l.fornecedor.trim())?.fornecedor.trim() || '—',
      pregao: linhas.find((l) => l.modalidadeLicitatoria.trim())?.modalidadeLicitatoria.trim() || '—',
      materialUtilizado: `${linhas.length} itens Div. Material na planilha enviada`,
      quantidade: linhas.length,
      valorUnitario: 0.01,
      valorTotal: 0.01 * linhas.length,
      folhaSala: '',
      descricaoCirurgica: `Envio de Div. Material com ${linhas.length} lançamentos para Confecção de Solemp.`,
      etiquetas: '',
      fotos: [],
    },
  }
}

export function buildControleSolempFromDivMaterial(
  linhas: DivMaterialLinha[],
): ControleSolempPlanilha {
  const MESES_NOME = [
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
  ]
  function mesAnoFromData(data: string): string {
    const match = data.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (!match) return ''
    const month = parseInt(match[2], 10)
    const yearRaw = match[3]
    const year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw, 10) : parseInt(yearRaw, 10)
    if (month < 1 || month > 12 || !Number.isFinite(year)) return ''
    return `${MESES_NOME[month - 1]}/${year}`
  }

  return {
    linhas: linhas.map((linha, index) => ({
      id: `controle-solemp-div-${linha.id}`,
      pacienteGrupoId: linha.id,
      numero: String(index + 1),
      divisao: CONTROLE_SOLEMP_DIVISAO_PADRAO,
      solemp: '',
      dataEnvioSolempFinancas: '',
      mesAnoReferencia: mesAnoFromData(linha.dataProcedimento),
      pi: '',
      descricao: [linha.descricaoMaterial, linha.nomePaciente, linha.nip]
        .map((p) => p.trim())
        .filter(Boolean)
        .join(' — '),
      tipoContratacao: linha.modalidadeLicitatoria,
      qtdSol: '1',
      valorUnitario: '',
      total: '',
      cnpj: linha.cnpj,
      ne: '',
      restosAPagar: '',
      dataEnvioNeFornecedor: '',
      dataEntregaFornecedor: '',
      prazoEntregaDias: '',
      statusEmpenho: '',
      nf: '',
      statusPagamento: '',
      valorPago: '',
      valorCancelado: '',
      pendencia: '',
      statusProcesso: 'EM ANDAMENTO',
    })),
  }
}
