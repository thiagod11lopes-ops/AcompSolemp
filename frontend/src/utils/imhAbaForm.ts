import type { ConmedComrjFormData, ImhAbaFormData, ImhAbaLinha } from '@/types'
import type { CreatePedidoInput } from '@/services/clinicaPedidoService'
import {
  formatConmedData,
  formatConmedMoeda,
  formatConmedNumero,
  formatConmedPacienteNip,
  formatConmedQuantidade,
  formatConmedUppercase,
} from '@/utils/conmedComrjForm'
import {
  formatValorBrasileiro,
  parseValorBrasileiro,
  type ConsumoMaterialRow,
} from '@/utils/consumoMaterialOds'
import type { ImhPlanilha } from '@/utils/imhPlanilhaTemplate'
import { formatNip } from '@/utils/format'

export function createEmptyImhAbaLinha(): ImhAbaLinha {
  return {
    id: `imh-linha-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    data: '',
    nip: '',
    nomeUsuario: '',
    vinculo: '',
    descricao: '',
    nipTitular: '',
    valorUnit: '',
    quantidade: '1',
    valorTotal: '',
    pctIndenizar: '',
  }
}

export const EMPTY_IMH_ABA_FORM: ImhAbaFormData = {
  clinica: '',
  numeroCp: '',
  linhas: [],
  finalizedImhIds: [],
}

export const IMH_ABA_COLUNAS = [
  { key: 'data', label: 'DATA', width: 88 },
  { key: 'nip', label: 'NIP', width: 108 },
  { key: 'nomeUsuario', label: 'NOME DO USUÁRIO', width: 220 },
  { key: 'vinculo', label: 'VÍNCULO', width: 140 },
  { key: 'descricao', label: 'DESCRIÇÃO DO PROCEDIMENTO/MEDICAMENTO', width: 280 },
  { key: 'nipTitular', label: 'NIP DO TITULAR', width: 108 },
  { key: 'valorUnit', label: 'VALOR UNIT', width: 110 },
  { key: 'quantidade', label: 'QUANTI.', width: 72 },
  { key: 'valorTotal', label: 'VALOR TOTAL', width: 110 },
  { key: 'pctIndenizar', label: '% A INDENIZAR', width: 120 },
] as const

export type ImhAbaColunaKey = (typeof IMH_ABA_COLUNAS)[number]['key']

export const IMH_ABA_INSTITUICAO = 'MARINHA DO BRASIL'
export const IMH_ABA_HOSPITAL = 'HOSPITAL NAVAL MARCÍLIO DIAS'

export function isVinculoTitular(vinculo: string): boolean {
  return vinculo.trim().toUpperCase() === 'TITULAR'
}

/** Normaliza rótulos legados de vínculo da IMH. */
export function normalizeImhVinculo(vinculo: string): string {
  const n = vinculo
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!n) return ''
  if (n === 'OUTRO' || n === 'OUTROS') return 'OUTROS'
  if (n.includes('INDIRETO')) return 'DEPENDENTE INDIRETO'
  if (n.includes('DIRETO') || n === 'DEPENDENTE') return 'DEPENDENTE DIRETO'
  if (n === 'TITULAR') return 'TITULAR'
  return vinculo.trim().toUpperCase()
}

/**
 * % A INDENIZAR = fatia do VALOR TOTAL conforme vínculo:
 * TITULAR / DEPENDENTE DIRETO → 20%; DEPENDENTE INDIRETO → 100%; OUTROS → vazio.
 */
export function pctIndenizarFromVinculoETotal(vinculo: string, valorTotal: string): string {
  const n = normalizeImhVinculo(vinculo)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!n || n === 'OUTROS') return ''
  const total = parseValorBrasileiro(valorTotal)
  if (total <= 0) return ''
  if (n.includes('INDIRETO')) return formatValorBrasileiro(total)
  if (n === 'TITULAR' || n.includes('DEPENDENTE DIRETO')) {
    return formatValorBrasileiro(total * 0.2)
  }
  return ''
}

export function withRecalculatedImhLinha(linha: ImhAbaLinha): ImhAbaLinha {
  const qtd = parseQuantidade(linha.quantidade)
  const unit = parseValorBrasileiro(linha.valorUnit)
  const total = qtd > 0 && unit > 0 ? unit * qtd : parseValorBrasileiro(linha.valorTotal)
  const nip = linha.nip.trim()
  const vinculo = normalizeImhVinculo(linha.vinculo)
  const nipTitular = isVinculoTitular(vinculo) ? nip : linha.nipTitular.trim()
  const valorTotal = total > 0 ? formatValorBrasileiro(total) : linha.valorTotal.trim()
  return {
    ...linha,
    nip,
    vinculo,
    nipTitular,
    valorTotal,
    pctIndenizar: pctIndenizarFromVinculoETotal(vinculo, valorTotal),
  }
}

function parseQuantidade(raw: string): number {
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function linhaHasContent(linha: ImhAbaLinha): boolean {
  return Boolean(
    linha.data.trim() ||
      linha.nip.trim() ||
      linha.nomeUsuario.trim() ||
      linha.vinculo.trim() ||
      linha.descricao.trim() ||
      linha.nipTitular.trim() ||
      linha.valorUnit.trim() ||
      (linha.quantidade.trim() && linha.quantidade.trim() !== '1') ||
      linha.valorTotal.trim() ||
      linha.pctIndenizar.trim(),
  )
}

export function normalizeImhAbaForm(value: ImhAbaFormData | undefined): ImhAbaFormData {
  const linhasRaw = Array.isArray(value?.linhas) ? value.linhas : []
  const linhas = linhasRaw
    .filter((item) => item && typeof item === 'object')
    .map((item) =>
      withRecalculatedImhLinha({
        id: item.id || createEmptyImhAbaLinha().id,
        data: item.data ?? '',
        nip: item.nip ?? '',
        nomeUsuario: item.nomeUsuario ?? '',
        vinculo: item.vinculo ?? '',
        descricao: item.descricao ?? '',
        nipTitular: item.nipTitular ?? '',
        valorUnit: item.valorUnit ?? '',
        quantidade: item.quantidade ?? '',
        valorTotal: item.valorTotal ?? '',
        pctIndenizar: item.pctIndenizar ?? '',
      }),
    )
    .filter((linha) => linhaHasContent(linha))
  const linhaIds = new Set(linhas.map((l) => l.id))
  return {
    clinica: value?.clinica ?? '',
    numeroCp: value?.numeroCp ?? '',
    linhas,
    finalizedImhIds: (value?.finalizedImhIds ?? []).filter((id) => linhaIds.has(id)),
  }
}

function formatDataHoje(): string {
  const d = new Date()
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

export function buildImhPlanilhaFromAbaForm(
  form: ImhAbaFormData,
  linhas: ImhAbaLinha[],
): ImhPlanilha {
  return {
    cabecalho: {
      numeroRelacao: form.numeroCp.trim(),
      pregaoTad: '',
      data: formatDataHoje(),
      vigencia: '',
      processo: '',
      fornecedor: form.clinica.trim(),
    },
    linhas: linhas.map((linha, index) => {
      const valorFmt =
        linha.valorTotal.trim() ||
        (parseValorBrasileiro(linha.valorUnit) > 0
          ? formatValorBrasileiro(parseValorBrasileiro(linha.valorUnit))
          : '')
      return {
        id: `imh-aba-${linha.id}`,
        pacienteGrupoId: linha.id,
        isLinhaPaciente: true,
        numero: String(index + 1),
        nip: linha.nip,
        iniciais: linha.nomeUsuario,
        data: linha.data,
        procedimento: linha.descricao,
        mapaSala: '',
        danfe: '',
        item: '',
        nebPi: '',
        descricaoMaterial: linha.descricao,
        qt: linha.quantidade.trim() || '1',
        valorUnit: linha.valorUnit || valorFmt,
        valorTotal: valorFmt || linha.valorUnit,
        subtotalPaciente: valorFmt || linha.valorUnit,
      }
    }),
  }
}

export function imhAbaLinhasToPedidoInput(
  linhas: ImhAbaLinha[],
  clinicaNome: string,
): CreatePedidoInput {
  if (linhas.length === 1) {
    const linha = linhas[0]
    const valor =
      parseValorBrasileiro(linha.valorTotal) ||
      parseValorBrasileiro(linha.valorUnit) ||
      0.01
    const qtd = parseQuantidade(linha.quantidade) || 1
    const vinculoRaw = linha.vinculo.trim().toUpperCase()
    const vinculo = vinculoRaw.includes('DEP') ? 'DEPENDENTE' : 'TITULAR'
    return {
      consumoRowIds: [linha.id],
      paciente: {
        nome: linha.nomeUsuario.trim() || '—',
        vinculo,
        nip: linha.nip.trim() || '—',
        nipTitular: linha.nipTitular.trim() || linha.nip.trim() || '—',
        nomeTitular: linha.nomeUsuario.trim() || '—',
        tipoUsuario: 'MILITAR',
      },
      dadosClinica: {
        nomeClinica: clinicaNome,
        medico: '—',
        procedimento: linha.descricao.trim() || 'Procedimento IMH',
        dataCirurgia: new Date().toISOString().slice(0, 10),
        empresaConsignada: '—',
        pregao: '—',
        materialUtilizado: linha.descricao.trim() || 'Procedimento IMH',
        quantidade: qtd,
        valorUnitario: valor / qtd,
        valorTotal: valor,
        folhaSala: '',
        descricaoCirurgica: `Envio IMH para Auditoria — ${linha.nomeUsuario.trim() || 'paciente'}.`,
        etiquetas: '',
        fotos: [],
      },
    }
  }

  const valorTotal = linhas.reduce((sum, linha) => {
    const v = parseValorBrasileiro(linha.valorTotal) || parseValorBrasileiro(linha.valorUnit)
    return sum + (v > 0 ? v : 0)
  }, 0)
  const titulo = `Planilha IMH — ${linhas.length} lançamentos`

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
      procedimento: `Lote IMH com ${linhas.length} lançamentos`,
      dataCirurgia: new Date().toISOString().slice(0, 10),
      empresaConsignada: '—',
      pregao: '—',
      materialUtilizado: `${linhas.length} itens IMH na planilha enviada`,
      quantidade: linhas.length,
      valorUnitario: valorTotal > 0 ? valorTotal / linhas.length : 0.01,
      valorTotal: valorTotal > 0 ? valorTotal : 0.01 * linhas.length,
      folhaSala: '',
      descricaoCirurgica: `Envio de planilha IMH com ${linhas.length} lançamentos para Auditoria.`,
      etiquetas: '',
      fotos: [],
    },
  }
}

export function markImhAbaLinhasFinalized(
  form: ImhAbaFormData,
  ids: string[],
): ImhAbaFormData {
  const next = new Set([...(form.finalizedImhIds ?? []), ...ids])
  return { ...form, finalizedImhIds: [...next] }
}

const IMH_AUTO_PREFIX = 'imh-auto-'

function isImhAutoLinhaId(id: string): boolean {
  return id.startsWith(IMH_AUTO_PREFIX)
}

/**
 * Preenche a aba IMH a partir do MODELO (CONMED / Consumo), só com o que couber:
 * - descricao ← PROCEDIMENTO
 * - nomeUsuario ← INICIAIS (ou nome, se houver no Consumo)
 * - data, nip, valorUnit, quantidade, valorTotal quando existirem
 * - numeroCp ← Nº do cabeçalho CONMED
 * Não preenche: clínica, vínculo, NIP titular, % a indenizar.
 * Linhas manuais (sem prefixo imh-auto-) são preservadas.
 */
export function syncImhAbaFromFontes(
  current: ImhAbaFormData,
  input: {
    conmed?: ConmedComrjFormData
    consumoRows?: ConsumoMaterialRow[]
  },
): ImhAbaFormData {
  const autoLinhas: ImhAbaLinha[] = []
  const seen = new Set<string>()

  for (const row of input.consumoRows ?? []) {
    const nip = formatNip(row.nip.trim()) || row.nip.trim()
    const data = row.data.trim()
    const procedimento = row.procedimento.trim()
    if (!nip && !data && !procedimento && !row.nome.trim() && !row.iniciais.trim()) continue
    const key = `consumo:${row.id}`
    if (seen.has(key)) continue
    seen.add(key)
    const qtd = row.qtd.trim() || '1'
    const unit =
      row.valorUnitario.trim() ||
      (row.valorNumerico > 0 ? formatValorBrasileiro(row.valorNumerico) : row.valor.trim())
    autoLinhas.push(
      withRecalculatedImhLinha({
        id: `${IMH_AUTO_PREFIX}${key}`,
        data,
        nip,
        nomeUsuario: row.nome.trim() || row.iniciais.trim(),
        vinculo: '',
        descricao: procedimento,
        nipTitular: '',
        valorUnit: unit,
        quantidade: qtd,
        valorTotal: '',
        pctIndenizar: '',
      }),
    )
  }

  for (const paciente of input.conmed?.pacientes ?? []) {
    const nip = formatNip(paciente.nip.trim()) || paciente.nip.trim()
    const data = paciente.data.trim()
    const procedimento = paciente.procedimento.trim()
    const materiais = paciente.materiais ?? []
    if (materiais.length === 0) {
      const key = `conmed-pac:${paciente.id}`
      if (seen.has(key)) continue
      if (!nip && !data && !procedimento && !paciente.iniciais.trim()) continue
      seen.add(key)
      autoLinhas.push(
        withRecalculatedImhLinha({
          id: `${IMH_AUTO_PREFIX}${key}`,
          data,
          nip,
          nomeUsuario: paciente.iniciais.trim(),
          vinculo: '',
          descricao: procedimento,
          nipTitular: '',
          valorUnit: '',
          quantidade: '1',
          valorTotal: '',
          pctIndenizar: '',
        }),
      )
      continue
    }
    for (const mat of materiais) {
      const key = `conmed-mat:${mat.id}`
      if (seen.has(key)) continue
      seen.add(key)
      autoLinhas.push(
        withRecalculatedImhLinha({
          id: `${IMH_AUTO_PREFIX}${key}`,
          data,
          nip,
          nomeUsuario: paciente.iniciais.trim(),
          vinculo: '',
          descricao: procedimento,
          nipTitular: '',
          valorUnit: mat.valorUnit.trim(),
          quantidade: mat.qt.trim() || '1',
          valorTotal: mat.valorTotal.trim(),
          pctIndenizar: '',
        }),
      )
    }
  }

  const manuais = current.linhas.filter((linha) => !isImhAutoLinhaId(linha.id))
  const linhas = [...autoLinhas, ...manuais].filter((linha) => linhaHasContent(linha))
  const linhaIds = new Set(linhas.map((l) => l.id))
  const numeroCp =
    input.conmed?.numero?.trim() || current.numeroCp.trim()

  return {
    clinica: current.clinica,
    numeroCp,
    linhas,
    finalizedImhIds: (current.finalizedImhIds ?? []).filter((id) => linhaIds.has(id)),
  }
}

export function imhFormHasPreviewContent(value: ImhAbaFormData): boolean {
  return Boolean(value.clinica.trim() || value.numeroCp.trim() || value.linhas.length > 0)
}

export function imhNumeroCpChip(value: ImhAbaFormData): string {
  const n = value.numeroCp.trim()
  return n ? `ANEXO DA CP — Nº CP ${n}` : 'ANEXO DA CP'
}

export function formatImhData(raw: string): string {
  return formatConmedData(raw)
}

export function formatImhNumeroCp(raw: string): string {
  return formatConmedNumero(raw)
}

export function formatImhNip(raw: string): string {
  return formatConmedPacienteNip(raw)
}

export function formatImhUppercase(raw: string): string {
  return formatConmedUppercase(raw)
}

export function formatImhQuantidade(raw: string): string {
  return formatConmedQuantidade(raw)
}

export function formatImhMoeda(raw: string): string {
  return formatConmedMoeda(raw)
}

export function calcImhTotalGeral(value: ImhAbaFormData): number {
  return value.linhas.reduce((sum, linha) => sum + parseValorBrasileiro(linha.valorTotal), 0)
}
