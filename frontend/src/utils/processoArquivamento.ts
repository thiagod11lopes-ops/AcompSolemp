import type { AppData, User } from '@/types'

const ETAPAS_ARQUIVAVEIS = new Set([
  'DIV_MAT_AUDITORIA',
  'DIV_MAT_CONTABILIDADE_IMH',
  'DIV_MAT_CONFECCAO_SOLEMP',
  'DIV_MAT_FINANCAS',
  'DIV_MAT_EMPENHADO',
])

export const MENSAGENS_ARQUIVAMENTO: Record<string, string> = {
  DIV_MAT_AUDITORIA: 'Planilha encaminhada ao IMH. Fluxo da Auditoria encerrado.',
  DIV_MAT_CONTABILIDADE_IMH: 'Planilha arquivada. Fluxo da Contabilidade/IMH encerrado.',
  DIV_MAT_CONFECCAO_SOLEMP: 'SOLEMP encaminhada para Solemp confeccionada.',
  DIV_MAT_FINANCAS: 'Registro em Solemp confeccionada. Encaminhado para Empenhado.',
  DIV_MAT_EMPENHADO: 'Empenhado concluído. Processo arquivado.',
}

function resolverNomeArquivo(
  data: AppData,
  pedidoId: string,
  etapaChave: string,
  pedidoNumero: string,
): string {
  const planilha = data.pedidoPlanilhaEnvio?.[pedidoId]
  if (
    etapaChave === 'DIV_MAT_AUDITORIA' ||
    etapaChave === 'DIV_MAT_CONTABILIDADE_IMH'
  ) {
    const titulo = planilha?.cabecalho.numeroRelacao?.trim()
    return titulo || `Planilha ${pedidoNumero}`
  }

  const solemp = data.solemp.find((s) => s.pedidoId === pedidoId)
  if (solemp?.numero) return `SOLEMP ${solemp.numero}`

  const nota = data.notasFiscais.find((n) => n.pedidoId === pedidoId)
  if (nota?.numero) return `NF ${nota.numero}`

  return `Processo ${pedidoNumero}`
}

export function arquivarEtapaConcluida(
  data: AppData,
  pedidoId: string,
  etapaChave: string,
  etapaNome: string,
  usuario: User,
  observacao: string,
): void {
  if (!ETAPAS_ARQUIVAVEIS.has(etapaChave)) return

  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) return

  if (!data.processosArquivados) data.processosArquivados = []

  const jaArquivado = data.processosArquivados.some(
    (item) => item.pedidoId === pedidoId && item.etapaChave === etapaChave,
  )
  if (jaArquivado) return

  const clinica = data.clinicas.find((c) => c.id === pedido.clinicaId)
  const arquivoNome = resolverNomeArquivo(data, pedidoId, etapaChave, pedido.numero)
  const mensagemArquivamento =
    MENSAGENS_ARQUIVAMENTO[etapaChave] ?? 'Processo arquivado neste setor.'

  data.processosArquivados.push({
    id: `arq-${Date.now()}-${etapaChave}`,
    pedidoId,
    pedidoNumero: pedido.numero,
    clinicaId: pedido.clinicaId,
    clinicaNome: clinica?.nome ?? '—',
    etapaChave,
    etapaNome,
    arquivoNome,
    concluidoEm: new Date().toISOString(),
    concluidoPorUsuarioId: usuario.id,
    concluidoPorNome: usuario.nome,
    observacao,
    valor: pedido.valor,
    mensagemArquivamento,
  })

  if (etapaChave === 'DIV_MAT_CONTABILIDADE_IMH' && data.pedidoPlanilhaEnvio?.[pedidoId]) {
    data.pedidoPlanilhaEnvio[pedidoId] = {
      ...data.pedidoPlanilhaEnvio[pedidoId],
      arquivadaEm: new Date().toISOString(),
    }
  }
}
