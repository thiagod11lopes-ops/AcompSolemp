import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import type { ImhCabecalho, ImhLinha } from '@/utils/imhPlanilhaTemplate'

export interface ImhXlsxLinha {
  data: string
  nip: string
  nome: string
  vinculo: string
  descricao: string
  nipTitular: string
  valorUnit: number
  quantidade: number
  valorTotal: number
}

function parseValor(valor: string): number {
  const cleaned = valor.replace(/[R$\s.]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function buildDescricao(consumo: ConsumoMaterialRow): string {
  const proc = consumo.procedimento.trim()
  const mat = consumo.materiais.trim()
  if (proc && mat) return `${proc} — ${mat}`
  return proc || mat
}

export function buildImhXlsxLinhas(
  consumoRows: ConsumoMaterialRow[],
  linhasImh: ImhLinha[],
): ImhXlsxLinha[] {
  const imhPorId = new Map<string, ImhLinha>()
  for (const linha of linhasImh) {
    if (linha.isLinhaPaciente) imhPorId.set(linha.pacienteGrupoId, linha)
  }

  return consumoRows.map((consumo) => {
    const imh = imhPorId.get(consumo.id)
    const valorTotal = imh?.valorTotal
      ? parseValor(imh.valorTotal) || consumo.valorNumerico
      : consumo.valorNumerico
    const quantidade = imh?.qt ? parseInt(imh.qt, 10) || 1 : 1
    const valorUnit = valorTotal > 0 ? valorTotal / quantidade : 0

    return {
      data: imh?.data?.trim() || consumo.data,
      nip: imh?.nip?.trim() || consumo.nip,
      nome: consumo.nome,
      vinculo: consumo.postoGrad?.trim() || 'TITULAR',
      descricao: imh?.descricaoMaterial?.trim() || buildDescricao(consumo),
      nipTitular: imh?.nip?.trim() || consumo.nip,
      valorUnit,
      quantidade,
      valorTotal,
    }
  })
}

export function getImhXlsxFileName(cabecalho: ImhCabecalho): string {
  const ref = cabecalho.numeroRelacao.replace(/\//g, '-') || 'planilha'
  return `Planilha-IMH-${ref}.xlsx`
}
