import type {
  Clinica,
  Empresa,
  Material,
  Pedido,
  WorkflowEtapa,
} from '@/types'
import {
  CONSUMO_MATERIAL_SEED,
  CLINICA_CONSUMO_OPME_ID,
  CLINICA_CONSUMO_OPME_NOME,
} from '@/utils/consumoMaterialTemplate'
import { consumoRowToPedidoInput, parseDataBrasileira } from '@/utils/consumoMaterialOds'

export const USUARIO_CLINICA_OPME_ID = 'user-clinica-opme'

function ensureEmpresa(empresas: Empresa[], nome: string, pedidoKey: string): string {
  const trimmed = nome.trim() || '—'
  const existing = empresas.find(
    (e) =>
      e.nomeFantasia.localeCompare(trimmed, 'pt-BR', { sensitivity: 'accent' }) === 0 ||
      e.razaoSocial.localeCompare(trimmed, 'pt-BR', { sensitivity: 'accent' }) === 0,
  )
  if (existing) return existing.id
  const id = `empresa-consumo-${pedidoKey}`
  empresas.push({
    id,
    razaoSocial: trimmed,
    nomeFantasia: trimmed,
    cnpj: '',
    contato: '',
    telefone: '',
    email: '',
  })
  return id
}

function ensureMaterial(materiais: Material[], descricao: string, pedidoKey: string): string {
  const trimmed = descricao.trim() || '—'
  const existing = materiais.find(
    (m) => m.descricao.localeCompare(trimmed, 'pt-BR', { sensitivity: 'accent' }) === 0,
  )
  if (existing) return existing.id
  const id = `material-consumo-${pedidoKey}`
  materiais.push({
    id,
    descricao: trimmed,
    fabricante: '',
    unidade: 'UN',
  })
  return id
}

function dataIsoFromRow(data: string): string {
  const parsed = parseDataBrasileira(data)
  if (parsed) return `${parsed}T12:00:00.000Z`
  return new Date().toISOString()
}

export function buildPedidosConsumoMaterialSeed(etapas: WorkflowEtapa[]): {
  clinica: Clinica
  pedidos: Pedido[]
  empresas: Empresa[]
  materiais: Material[]
} {
  const solicitacao = etapas.find((e) => e.chave === 'SOLICITACAO')
  const auditoria = etapas.find((e) => e.chave === 'DIV_MAT_AUDITORIA')
  const confeccao = etapas.find((e) => e.chave === 'DIV_MAT_CONFECCAO_SOLEMP')
  if (!solicitacao || !auditoria || !confeccao) {
    throw new Error('Workflow incompleto para seed de consumo material')
  }

  const empresas: Empresa[] = []
  const materiais: Material[] = []
  const pedidos: Pedido[] = []

  for (let index = 0; index < CONSUMO_MATERIAL_SEED.length; index++) {
    const row = CONSUMO_MATERIAL_SEED[index]
    const pedidoKey = row.id.replace(/[^a-zA-Z0-9-]/g, '-')
    const input = consumoRowToPedidoInput(row, CLINICA_CONSUMO_OPME_NOME)
    const empresaId = ensureEmpresa(empresas, input.dadosClinica.empresaConsignada, pedidoKey)
    const materialId = ensureMaterial(materiais, input.dadosClinica.materialUtilizado, pedidoKey)
    const agora = dataIsoFromRow(row.data)
    const numero = `PED-${String(index + 1).padStart(5, '0')}`
    const observacao = `Consumo material consignado — ${row.nome} (NIP ${row.nip}).`

    pedidos.push({
      id: `pedido-${row.id}`,
      numero,
      clinicaId: CLINICA_CONSUMO_OPME_ID,
      empresaId,
      materialId,
      quantidade: input.dadosClinica.quantidade,
      valor: input.dadosClinica.valorTotal,
      observacoes: observacao,
      paciente: input.paciente,
      dadosClinica: input.dadosClinica,
      dataSolicitacao: agora,
      dataEntrega: null,
      etapaAtualId: confeccao.id,
      etapasAtivasIds: [confeccao.id, auditoria.id],
      responsavelAtualId: USUARIO_CLINICA_OPME_ID,
      concluido: false,
      etapasHistorico: [
        {
          etapaId: solicitacao.id,
          etapaNome: solicitacao.nome,
          responsavelId: USUARIO_CLINICA_OPME_ID,
          responsavelNome: CLINICA_CONSUMO_OPME_NOME,
          dataInicio: agora,
          dataConclusao: agora,
          observacao,
          arquivos: [],
        },
        {
          etapaId: auditoria.id,
          etapaNome: auditoria.nome,
          responsavelId: null,
          responsavelNome: null,
          dataInicio: agora,
          dataConclusao: null,
          observacao: 'Fluxo paralelo — Material (Auditoria).',
          arquivos: [],
        },
        {
          etapaId: confeccao.id,
          etapaNome: confeccao.nome,
          responsavelId: null,
          responsavelNome: null,
          dataInicio: agora,
          dataConclusao: null,
          observacao: 'Fluxo paralelo — Material (Confecção de Solemp).',
          arquivos: [],
        },
      ],
    })
  }

  return {
    clinica: {
      id: CLINICA_CONSUMO_OPME_ID,
      nome: CLINICA_CONSUMO_OPME_NOME,
      responsavel: 'Div. de Material — OPME TRO',
      telefone: '',
    },
    pedidos,
    empresas,
    materiais,
  }
}

export const TOTAL_LANCAMENTOS_CONSUMO = CONSUMO_MATERIAL_SEED.length
