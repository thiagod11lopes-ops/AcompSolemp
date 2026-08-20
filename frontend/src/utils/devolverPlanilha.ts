import type {
  AppData,
  Pedido,
  PedidoComDetalhes,
  PedidoPlanilhaEnvioState,
  User,
  UserRole,
  WorkflowEtapa,
} from '@/types'
import { getResponsavelParaEtapa } from '@/utils/workflow'
import { enrichPedido } from '@/utils/workflow'

export type DestinoDevolucaoId = 'clinica' | 'medicamento' | string
export type OrigemPlanilha = 'clinica' | 'medicamento'

export interface DestinoDevolucaoPlanilha {
  id: DestinoDevolucaoId
  label: string
  detalhe: string
  etapaChave: string
  perfilNotificar: UserRole
  notificaOrigem: boolean
}

const SETORES_CAMINHO_CLINICA = [
  'DIV_MAT_AUDITORIA',
  'DIV_MAT_CONFECCAO_SOLEMP',
  'DIV_MAT_CONTABILIDADE_IMH',
] as const

const SETORES_CAMINHO_MEDICAMENTO = [
  'DIV_MAT_AUDITORIA',
  'DIV_MAT_CONTABILIDADE_IMH',
] as const

function historicoDaEtapa(
  pedido: Pick<PedidoComDetalhes, 'etapasHistorico'>,
  etapas: WorkflowEtapa[],
  chave: string,
) {
  const etapa = etapas.find((item) => item.chave === chave)
  if (!etapa) return null
  return (
    pedido.etapasHistorico.find(
      (h) => h.etapaId === etapa.id || h.etapaNome === etapa.nome,
    ) ?? null
  )
}

export function origemProducaoPlanilha(
  pedido: PedidoComDetalhes,
  planilha: PedidoPlanilhaEnvioState | null,
): OrigemPlanilha {
  if (planilha?.formato === 'imhMedicamento') return 'medicamento'
  if (pedido.clinica.tipo === 'medicamento') return 'medicamento'
  return 'clinica'
}

function setorVisitado(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  planilha: PedidoPlanilhaEnvioState | null,
  chave: string,
): boolean {
  const hist = historicoDaEtapa(pedido, etapas, chave)
  if (hist?.dataInicio) return true
  if (chave === 'DIV_MAT_AUDITORIA') {
    return Boolean(
      planilha?.recebidaEm &&
        !historicoDaEtapa(pedido, etapas, 'DIV_MAT_CONFECCAO_SOLEMP')?.dataInicio,
    )
  }
  if (chave === 'DIV_MAT_CONTABILIDADE_IMH') {
    return Boolean(planilha?.encaminhadaImhEm || planilha?.recebidaImhEm)
  }
  if (chave === 'DIV_MAT_CONFECCAO_SOLEMP') {
    return Boolean(
      planilha?.recebidaEm && historicoDaEtapa(pedido, etapas, 'DIV_MAT_CONFECCAO_SOLEMP'),
    )
  }
  return false
}

export function pedidoSuspensoParaSetor(
  pedido: Pick<Pedido, 'planilhaDevolvidaParaChave'>,
  chaveSetor: string,
): boolean {
  if (!pedido.planilhaDevolvidaParaChave) return false
  return pedido.planilhaDevolvidaParaChave !== chaveSetor
}

/** Setores que efetivamente receberam/abriram a planilha no caminho. */
export function listarSetoresComAcessoPlanilha(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  planilha: PedidoPlanilhaEnvioState | null,
): Array<{ chave: string; label: string; perfilNotificar: UserRole }> {
  const origem = origemProducaoPlanilha(pedido, planilha)
  const setores: Array<{ chave: string; label: string; perfilNotificar: UserRole }> = []

  if (origem === 'medicamento') {
    setores.push({
      chave: 'SOLICITACAO',
      label: 'Medicamento',
      perfilNotificar: 'MEDICAMENTO',
    })
  } else {
    setores.push({
      chave: 'SOLICITACAO',
      label: 'Clínica',
      perfilNotificar: 'CLINICA',
    })
  }

  const setoresCaminho =
    origem === 'medicamento' ? SETORES_CAMINHO_MEDICAMENTO : SETORES_CAMINHO_CLINICA

  for (const chave of setoresCaminho) {
    if (!setorVisitado(pedido, etapas, planilha, chave)) continue
    const etapa = etapas.find((item) => item.chave === chave)
    if (!etapa) continue
    setores.push({
      chave,
      label: etapa.nome,
      perfilNotificar: etapa.perfilResponsavel,
    })
  }

  return setores
}

/** Destinos do caminho real da planilha: só quem produziu/enviou e os setores que a receberam. */
export function listarDestinosDevolucaoPlanilha(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  planilha: PedidoPlanilhaEnvioState | null,
  setorAtualChave: string,
): DestinoDevolucaoPlanilha[] {
  const origem = origemProducaoPlanilha(pedido, planilha)
  return listarSetoresComAcessoPlanilha(pedido, etapas, planilha)
    .filter((setor) => setor.chave !== setorAtualChave)
    .map((setor) => ({
      id:
        setor.chave === 'SOLICITACAO'
          ? origem === 'medicamento'
            ? 'medicamento'
            : 'clinica'
          : setor.chave,
      label: setor.label,
      detalhe:
        setor.chave === 'SOLICITACAO'
          ? `Devolve à ${setor.label} que produziu e enviou a planilha. O setor será notificado.`
          : `Retorna a planilha para ${setor.label}.`,
      etapaChave: setor.chave,
      perfilNotificar: setor.perfilNotificar,
      notificaOrigem: setor.chave === 'SOLICITACAO',
    }))
}

function nowIso(): string {
  return new Date().toISOString()
}

function uniqueStrings(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).filter((id) => typeof id === 'string' && id.length > 0))]
}

function rowIdsDoPedido(data: AppData, pedido: Pedido): string[] {
  if (pedido.consumoRowIds?.length) return [...pedido.consumoRowIds]
  const planilha = data.pedidoPlanilhaEnvio?.[pedido.id]
  return uniqueStrings(planilha?.imhMedicamentoLinhas?.map((linha) => linha.id))
}

function moverIdsParaDevolvidos(
  finalized: string[] | undefined,
  devolvidos: string[] | undefined,
  ids: Set<string>,
): { finalized: string[]; devolvidos: string[] } {
  const nextFinalized: string[] = []
  const nextDevolvidos = new Set(uniqueStrings(devolvidos))
  for (const id of uniqueStrings(finalized)) {
    if (ids.has(id)) nextDevolvidos.add(id)
    else nextFinalized.push(id)
  }
  return { finalized: nextFinalized, devolvidos: [...nextDevolvidos] }
}

/** Desmarca linhas enviadas e as pinta de laranja para reenvio (clínica/medicamento). */
function desmarcarCheckboxesOrigem(data: AppData, pedido: Pedido): void {
  const ids = new Set(rowIdsDoPedido(data, pedido))
  if (ids.size === 0) return

  if (!data.consumoPlanilha) data.consumoPlanilha = {}
  const consumo = data.consumoPlanilha[pedido.clinicaId]
  if (consumo) {
    const auditoria = moverIdsParaDevolvidos(
      consumo.finalizedAuditoriaRowIds ?? consumo.finalizedRowIds,
      consumo.devolvidosAuditoriaRowIds,
      ids,
    )
    const material = moverIdsParaDevolvidos(
      consumo.finalizedMaterialRowIds,
      consumo.devolvidosMaterialRowIds,
      ids,
    )
    data.consumoPlanilha[pedido.clinicaId] = {
      ...consumo,
      finalizedRowIds: auditoria.finalized,
      finalizedAuditoriaRowIds: auditoria.finalized,
      finalizedMaterialRowIds: material.finalized,
      devolvidosAuditoriaRowIds: auditoria.devolvidos,
      devolvidosMaterialRowIds: material.devolvidos,
    }
  }

  if (!data.planilhasLivres) data.planilhasLivres = {}
  const livres = data.planilhasLivres[pedido.clinicaId]
  if (livres?.imhMedicamento) {
    const imh = moverIdsParaDevolvidos(
      livres.imhMedicamento.finalizedImhIds,
      livres.imhMedicamento.devolvidosImhIds,
      ids,
    )
    data.planilhasLivres[pedido.clinicaId] = {
      ...livres,
      imhMedicamento: {
        ...livres.imhMedicamento,
        finalizedImhIds: imh.finalized,
        devolvidosImhIds: imh.devolvidos,
      },
    }
  }
}

export function pedidoDevolvidoParaOrigem(
  pedido: Pick<Pedido, 'planilhaDevolvidaParaChave'>,
): boolean {
  return pedido.planilhaDevolvidaParaChave === 'SOLICITACAO'
}

/** Extrai a justificativa pura de uma observação de devolução (retrocompatível). */
export function extrairJustificativaDevolucao(
  observacao: string | null | undefined,
): string | null {
  if (!observacao?.trim()) return null
  const match = observacao.match(/Justificativa:\s*(.+)$/s)
  return match?.[1]?.trim() || observacao.trim()
}

export function resolveJustificativaDevolucaoPedido(
  pedido: Pick<Pedido, 'planilhaDevolvidaJustificativa' | 'etapasHistorico'>,
  _etapaChave: string,
  etapaId?: string,
  etapaNome?: string,
): string | null {
  if (pedido.planilhaDevolvidaJustificativa?.trim()) {
    return pedido.planilhaDevolvidaJustificativa.trim()
  }
  const historico = pedido.etapasHistorico.find(
    (h) =>
      h.etapaId === etapaId ||
      (etapaNome && h.etapaNome === etapaNome) ||
      h.observacao?.includes('Planilha devolvida'),
  )
  return extrairJustificativaDevolucao(historico?.observacao)
}

export function limparEstadoDevolucaoPlanilha(data: AppData, pedidoId: string): void {
  const index = data.pedidos.findIndex((item) => item.id === pedidoId)
  if (index >= 0) {
    data.pedidos[index] = {
      ...data.pedidos[index],
      planilhaDevolvidaParaChave: null,
      planilhaDevolvidaEm: null,
      planilhaDevolvidaJustificativa: null,
      planilhaDevolvidaDeChave: null,
      planilhaSetoresAcessoSnapshot: undefined,
    }
  }
  const atual = data.pedidoPlanilhaEnvio?.[pedidoId]
  if (!atual) return
  data.pedidoPlanilhaEnvio![pedidoId] = {
    ...atual,
    devolvidaEm: undefined,
    devolvidaParaChave: undefined,
  }
}

function ajustarFlagsPlanilha(
  data: AppData,
  pedidoId: string,
  etapaChave: string,
): void {
  const atual = data.pedidoPlanilhaEnvio?.[pedidoId]
  if (!atual) return

  if (etapaChave === 'SOLICITACAO') {
    data.pedidoPlanilhaEnvio![pedidoId] = {
      ...atual,
      enviadoEm: '',
      recebidaEm: undefined,
      encaminhadaImhEm: undefined,
      recebidaImhEm: undefined,
      arquivadaEm: undefined,
    }
    return
  }

  if (etapaChave === 'DIV_MAT_AUDITORIA' || etapaChave === 'DIV_MAT_CONFECCAO_SOLEMP') {
    data.pedidoPlanilhaEnvio![pedidoId] = {
      ...atual,
      recebidaEm: undefined,
      encaminhadaImhEm: undefined,
      recebidaImhEm: undefined,
      arquivadaEm: undefined,
    }
    return
  }

  if (etapaChave === 'DIV_MAT_CONTABILIDADE_IMH') {
    data.pedidoPlanilhaEnvio![pedidoId] = {
      ...atual,
      recebidaImhEm: undefined,
      arquivadaEm: undefined,
    }
  }
}

function chavesAposDestino(destinoChave: string): string[] {
  if (destinoChave === 'SOLICITACAO') {
    return [
      'DIV_MAT_AUDITORIA',
      'DIV_MAT_CONFECCAO_SOLEMP',
      'DIV_MAT_CONTABILIDADE_IMH',
      'DIV_MAT_FINANCAS',
      'DIV_MAT_EMPENHADO',
    ]
  }
  if (destinoChave === 'DIV_MAT_AUDITORIA') {
    return ['DIV_MAT_CONTABILIDADE_IMH']
  }
  if (destinoChave === 'DIV_MAT_CONFECCAO_SOLEMP') {
    return ['DIV_MAT_FINANCAS', 'DIV_MAT_EMPENHADO']
  }
  return []
}

export function devolverPlanilhaParaDestino(
  data: AppData,
  pedidoId: string,
  destino: DestinoDevolucaoPlanilha,
  usuario: User,
  justificativa: string,
  setorDevolvedorChave: string,
): AppData {
  const justificativaLimpa = justificativa.trim()
  if (justificativaLimpa.length < 10) {
    throw new Error('Informe a justificativa da devolução (mínimo 10 caracteres).')
  }

  const pedidoIndex = data.pedidos.findIndex((p) => p.id === pedidoId)
  if (pedidoIndex < 0) throw new Error('Pedido não encontrado')

  const pedido = { ...data.pedidos[pedidoIndex] }
  if (pedido.concluido) throw new Error('Processo já encerrado')

  const planilhaAntes = data.pedidoPlanilhaEnvio?.[pedidoId] ?? null
  const ctxAcesso = {
    clinicas: data.clinicas,
    empresas: data.empresas,
    materiais: data.materiais,
    etapas: data.workflowEtapas,
    usuarios: data.usuarios,
    solemp: data.solemp,
    notasFiscais: data.notasFiscais,
  }
  const pedidoAntesDetalhes = enrichPedido(pedido, ctxAcesso)
  const setorDevolvedorEtapa = data.workflowEtapas.find((e) => e.chave === setorDevolvedorChave)
  const setorDevolvedorLabel = setorDevolvedorEtapa?.nome ?? 'Setor'

  const etapaDestino = data.workflowEtapas.find((e) => e.chave === destino.etapaChave)
  if (!etapaDestino) throw new Error('Setor de destino não encontrado')

  const etapaPorId = new Map(data.workflowEtapas.map((e) => [e.id, e]))
  const chavesDescartar = new Set(chavesAposDestino(destino.etapaChave))

  const historico = pedido.etapasHistorico.map((h) => ({ ...h }))
  const proximoHistorico = historico.filter((h) => {
    const chave = etapaPorId.get(h.etapaId)?.chave
    if (chave && chavesDescartar.has(chave)) return false
    return true
  })

  const observacao = `Planilha devolvida por ${usuario.nome} para ${destino.label}. Justificativa: ${justificativaLimpa}`

  const alvo = proximoHistorico.find(
    (h) =>
      h.etapaId === etapaDestino.id ||
      h.etapaNome === etapaDestino.nome ||
      etapaPorId.get(h.etapaId)?.chave === destino.etapaChave,
  )
  if (alvo) {
    alvo.dataConclusao = null
    alvo.observacao = observacao
  } else {
    const responsavelNovo = getResponsavelParaEtapa(etapaDestino, data.usuarios, pedido.clinicaId)
    proximoHistorico.push({
      etapaId: etapaDestino.id,
      etapaNome: etapaDestino.nome,
      responsavelId: responsavelNovo?.id ?? usuario.id,
      responsavelNome: responsavelNovo?.nome ?? usuario.nome,
      dataInicio: nowIso(),
      dataConclusao: null,
      observacao,
      arquivos: [],
    })
  }

  const responsavel = getResponsavelParaEtapa(etapaDestino, data.usuarios, pedido.clinicaId)
  const ativas = (pedido.etapasAtivasIds?.length ? pedido.etapasAtivasIds : [pedido.etapaAtualId]).filter(
    (id) => {
      const chave = etapaPorId.get(id)?.chave
      if (!chave) return false
      if (chavesDescartar.has(chave)) return false
      if (id === pedido.etapaAtualId) return false
      return true
    },
  )
  if (!ativas.includes(etapaDestino.id)) ativas.unshift(etapaDestino.id)

  data.pedidos[pedidoIndex] = {
    ...pedido,
    etapaAtualId: etapaDestino.id,
    etapasAtivasIds: ativas,
    responsavelAtualId: responsavel?.id ?? usuario.id,
    concluido: false,
    etapasHistorico: proximoHistorico,
    dataEntrega: destino.etapaChave === 'SOLICITACAO' ? null : pedido.dataEntrega,
    planilhaDevolvidaParaChave: destino.etapaChave,
    planilhaDevolvidaEm: nowIso(),
    planilhaDevolvidaJustificativa: justificativaLimpa,
    planilhaDevolvidaDeChave: setorDevolvedorChave,
    planilhaSetoresAcessoSnapshot: pedidoAntesDetalhes
      ? listarSetoresComAcessoPlanilha(
          pedidoAntesDetalhes,
          data.workflowEtapas,
          planilhaAntes,
        ).map((s) => s.chave)
      : undefined,
  }

  if (data.processosArquivados) {
    data.processosArquivados = data.processosArquivados.filter((item) => {
      if (item.pedidoId !== pedidoId) return true
      return !chavesDescartar.has(item.etapaChave) && item.etapaChave !== destino.etapaChave
    })
  }

  ajustarFlagsPlanilha(data, pedidoId, destino.etapaChave)

  const planilhaAtual = data.pedidoPlanilhaEnvio?.[pedidoId]
  if (planilhaAtual) {
    data.pedidoPlanilhaEnvio![pedidoId] = {
      ...planilhaAtual,
      devolvidaEm: nowIso(),
      devolvidaParaChave: destino.etapaChave,
    }
  }

  if (destino.etapaChave === 'SOLICITACAO') {
    desmarcarCheckboxesOrigem(data, {
      ...data.pedidos[pedidoIndex],
    })
  }

  const etapaAtual = setorDevolvedorEtapa ??
    data.workflowEtapas.find((e) => e.id === pedido.etapaAtualId)
  const clinicaNome =
    data.clinicas.find((c) => c.id === pedido.clinicaId)?.nome ?? destino.label
  const reversaoId = `rev-planilha-${Date.now()}`

  if (!data.reversoes) data.reversoes = []
  data.reversoes.push({
    id: reversaoId,
    pedidoId,
    pedidoNumero: pedido.numero,
    clinicaNome,
    etapaDeNome: etapaAtual?.nome ?? 'Setor atual',
    etapaParaNome: destino.label,
    motivo: justificativaLimpa,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    data: nowIso(),
    status: 'PENDENTE',
    respostaGestor: null,
    dataResposta: null,
    gestorNome: null,
  })

  data.historico.push({
    id: `hist-devolver-${Date.now()}`,
    pedidoId,
    etapaId: etapaDestino.id,
    etapaNome: etapaDestino.nome,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    data: nowIso(),
    observacao,
  })

  data.notificacoes.push({
    id: `notif-devolver-${pedidoId}-${destino.id}-${Date.now()}`,
    tipo: 'PLANILHA_DEVOLVIDA',
    titulo: `Planilha devolvida — ${pedido.numero}`,
    mensagem: `${usuario.nome} devolveu a planilha para ${destino.label}. Justificativa: ${justificativaLimpa}`,
    pedidoId,
    reversaoId,
    perfilDestino: destino.perfilNotificar,
    etapaChave: destino.etapaChave,
    lida: false,
    data: nowIso(),
  })

  data.notificacoes.push({
    id: `notif-devolver-gestor-${pedidoId}-${Date.now()}`,
    tipo: 'REVERSAO_TIMELINE',
    titulo: `Devolução de planilha — ${pedido.numero}`,
    mensagem: `${usuario.nome} devolveu a planilha para ${destino.label}. ${justificativaLimpa}`,
    pedidoId,
    reversaoId,
    perfilDestino: null,
    etapaChave: destino.etapaChave,
    lida: false,
    data: nowIso(),
  })

  const pedidoDetalhes = pedidoAntesDetalhes
  if (pedidoDetalhes) {
    const testemunhas = listarSetoresComAcessoPlanilha(
      pedidoDetalhes,
      data.workflowEtapas,
      planilhaAntes,
    ).filter(
      (setor) =>
        setor.chave !== setorDevolvedorChave && setor.chave !== destino.etapaChave,
    )

    for (const [index, setor] of testemunhas.entries()) {
      data.notificacoes.push({
        id: `notif-devolver-aviso-${pedidoId}-${setor.chave}-${Date.now()}-${index}`,
        tipo: 'PLANILHA_DEVOLVIDA_AVISO',
        titulo: `Planilha devolvida — ${pedido.numero}`,
        mensagem: `${setorDevolvedorLabel} devolveu a planilha ${pedido.numero} para ${destino.label} (correção). Motivo: ${justificativaLimpa}`,
        pedidoId,
        reversaoId,
        perfilDestino: setor.perfilNotificar,
        etapaChave: setor.chave,
        lida: false,
        data: nowIso(),
      })
    }
  }

  return data
}
