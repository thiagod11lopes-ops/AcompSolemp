import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'
import type { MesConsumoModelo } from '@/utils/consumoMaterialTemplate'

export interface ControleSolempLinha {
  id: string
  pacienteGrupoId: string
  /** ID sequencial na planilha */
  numero: string
  divisao: string
  solemp: string
  dataEnvioSolempFinancas: string
  mesAnoReferencia: string
  pi: string
  descricao: string
  tipoContratacao: string
  qtdSol: string
  valorUnitario: string
  total: string
  cnpj: string
  ne: string
  restosAPagar: string
  dataEnvioNeFornecedor: string
  dataEntregaFornecedor: string
  prazoEntregaDias: string
  statusEmpenho: string
  nf: string
  statusPagamento: string
  valorPago: string
  valorCancelado: string
  pendencia: string
  statusProcesso: string
}

export interface ControleSolempPlanilha {
  linhas: ControleSolempLinha[]
}

export const CONTROLE_SOLEMP_DIVISAO_PADRAO =
  '26.5 - Divisão de Material Consignado'

export const CONTROLE_SOLEMP_COLUNAS = [
  { key: 'numero', label: 'ID', width: 52 },
  { key: 'divisao', label: 'DIVISÃO', width: 200 },
  { key: 'solemp', label: 'SOLEMP', width: 120 },
  { key: 'dataEnvioSolempFinancas', label: 'DATA ENVIO DA SOLEMP PARA DIV FINANÇAS', width: 160 },
  { key: 'mesAnoReferencia', label: 'MÊS/ANO REFERÊNCIA', width: 130 },
  { key: 'pi', label: 'PI', width: 120 },
  { key: 'descricao', label: 'DESCRIÇÃO', width: 260 },
  { key: 'tipoContratacao', label: 'TIPO DE CONTRATAÇÃO', width: 140 },
  { key: 'qtdSol', label: 'QTD SOL', width: 72 },
  { key: 'valorUnitario', label: 'VALOR UNITÁRIO', width: 110 },
  { key: 'total', label: 'TOTAL', width: 110 },
  { key: 'cnpj', label: 'CNPJ', width: 130 },
  { key: 'ne', label: 'NE', width: 110 },
  { key: 'restosAPagar', label: 'RESTOS A PAGAR', width: 110 },
  { key: 'dataEnvioNeFornecedor', label: 'DATA DE ENVIO NE AO FORNECEDOR', width: 150 },
  { key: 'dataEntregaFornecedor', label: 'DATA DE ENTREGA FORNECEDOR', width: 140 },
  {
    key: 'prazoEntregaDias',
    label: 'PRAZO DE ENTREGA (FORNECEDOR) - DIAS ÚTEIS',
    width: 160,
  },
  { key: 'statusEmpenho', label: 'STATUS DO EMPENHO', width: 130 },
  { key: 'nf', label: 'NF', width: 120 },
  { key: 'statusPagamento', label: 'STATUS PAGAMENTO', width: 120 },
  { key: 'valorPago', label: 'VALOR PAGO R$', width: 110 },
  { key: 'valorCancelado', label: 'VALOR CANCELADO', width: 110 },
  { key: 'pendencia', label: 'PENDÊNCIA R$', width: 110 },
  { key: 'statusProcesso', label: 'STATUS DO PROCESSO', width: 130 },
] as const

export type ControleSolempColunaKey = (typeof CONTROLE_SOLEMP_COLUNAS)[number]['key']

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

function mesAnoFromModelo(mes?: MesConsumoModelo): string {
  if (!mes) return ''
  return `${MESES_NOME[mes.mes - 1]}/${mes.ano}`
}

function formatValorLinha(row: ConsumoMaterialRow): string {
  if (row.valorNumerico > 0) return formatValorBrasileiro(row.valorNumerico)
  return row.valor.trim()
}

export function createEmptyControleSolempLinha(
  pacienteGrupoId: string,
  numero = '',
): ControleSolempLinha {
  return {
    id: `controle-solemp-${pacienteGrupoId}-${Date.now()}`,
    pacienteGrupoId,
    numero,
    divisao: CONTROLE_SOLEMP_DIVISAO_PADRAO,
    solemp: '',
    dataEnvioSolempFinancas: '',
    mesAnoReferencia: '',
    pi: '',
    descricao: '',
    tipoContratacao: '',
    qtdSol: '1',
    valorUnitario: '',
    total: '',
    cnpj: '',
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
  }
}

export function buildControleSolempFromConsumo(
  consumoRows: ConsumoMaterialRow[],
  mesReferencia?: MesConsumoModelo,
): ControleSolempPlanilha {
  const mesFallback = mesAnoFromModelo(mesReferencia)

  const linhas = consumoRows.map((row, index) => {
    const valorFmt = formatValorLinha(row)
    const mesAno = mesAnoFromData(row.data) || mesFallback

    return {
      id: `controle-solemp-${row.id}`,
      pacienteGrupoId: row.id,
      numero: String(index + 1),
      divisao: CONTROLE_SOLEMP_DIVISAO_PADRAO,
      solemp: '',
      dataEnvioSolempFinancas: '',
      mesAnoReferencia: mesAno,
      pi: '',
      descricao: row.materiais.trim() || row.procedimento.trim(),
      tipoContratacao: row.ref.trim(),
      qtdSol: '1',
      valorUnitario: valorFmt,
      total: valorFmt,
      cnpj: '',
      ne: '',
      restosAPagar: '',
      dataEnvioNeFornecedor: '',
      dataEntregaFornecedor: '',
      prazoEntregaDias: '',
      statusEmpenho: '',
      nf: row.danfe.trim(),
      statusPagamento: '',
      valorPago: '',
      valorCancelado: '',
      pendencia: valorFmt,
      statusProcesso: 'EM ANDAMENTO',
    } satisfies ControleSolempLinha
  })

  return { linhas }
}

export function calcularTotalControleSolemp(linhas: ControleSolempLinha[]): number {
  return linhas.reduce((sum, linha) => {
    const cleaned = linha.total.replace(/[R$\s.]/g, '').replace(',', '.')
    const n = parseFloat(cleaned)
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)
}

export function getControleSolempCsvFileName(): string {
  const stamp = new Date().toISOString().slice(0, 10)
  return `Controle-SOLEMP-${stamp}.csv`
}

export function downloadControleSolempCsv(
  planilha: ControleSolempPlanilha,
  fileName?: string,
): void {
  const headers = CONTROLE_SOLEMP_COLUNAS.map((c) => c.label)
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const rows = planilha.linhas.map((linha) =>
    CONTROLE_SOLEMP_COLUNAS.map((col) => escape(String(linha[col.key] ?? ''))).join(';'),
  )
  const csv = `\uFEFF${headers.join(';')}\n${rows.join('\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName ?? getControleSolempCsvFileName()
  anchor.click()
  URL.revokeObjectURL(url)
}
