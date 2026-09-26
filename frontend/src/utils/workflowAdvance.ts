import type {
  AppData,
  HistoricoEvento,
  NotaFiscal,
  Pedido,
  PedidoEtapaHistorico,
  Solemp,
  User,
  WorkflowEtapa,
} from '@/types'
import { getResponsavelParaEtapa, resolveEtapaFromRef } from '@/utils/workflow'
import {
  getEtapaByChave,
  getDestinosEncaminhamentoAuditoria,
  getProximaChaveNaDivisao,
  isPedidoTimelineMedicamento,
} from '@/utils/timelineFlow'
import { arquivarEtapaConcluida } from '@/utils/processoArquivamento'
import { validateSolempNumero } from '@/utils/solemp'
import { formatDuracaoEntre, formatTempoCorrecaoPrefixo } from '@/utils/format'

function nowIso(): string {
  return new Date().toISOString()
}

function completeEtapaById(
  pedido: Pedido,
  etapaId: string,
  observacao: string,
  etapas: WorkflowEtapa[] = [],
): PedidoEtapaHistorico[] {
  const historico = pedido.etapasHistorico.map((h) => ({ ...h }))
  const agora = nowIso()
  let concluiu = false
  for (const item of historico) {
    if (item.dataConclusao) continue
    const resolvida = resolveEtapaFromRef(item.etapaId, item.etapaNome, etapas)
    const mesmoId = item.etapaId === etapaId
    const mesmaEtapa = resolvida?.id === etapaId
    if (!mesmoId && !mesmaEtapa) continue
    item.dataConclusao = agora
    if (observacao) item.observacao = observacao
    // Alinha id/nome ao catálogo atual (evita pendência fantasma por id antigo).
    if (resolvida) {
      item.etapaId = resolvida.id
      item.etapaNome = resolvida.nome
    }
    concluiu = true
  }
  if (!concluiu) {
    const atual = historico.find((h) => h.etapaId === etapaId && h.dataConclusao === null)
    if (atual) {
      atual.dataConclusao = agora
      if (observacao) atual.observacao = observacao
    }
  }
  return historico
}

function historicoDaEtapa(
  pedido: Pedido,
  etapas: WorkflowEtapa[],
  chave: string,
): PedidoEtapaHistorico | null {
  const etapa = getEtapaByChave(etapas, chave)
  if (!etapa) return null
  return pedido.etapasHistorico.find((h) => h.etapaId === etapa.id) ?? null
}

function trilhaImhIniciada(pedido: Pedido, etapas: WorkflowEtapa[]): boolean {
  return (
    historicoDaEtapa(pedido, etapas, 'DIV_MAT_AUDITORIA') !== null ||
    historicoDaEtapa(pedido, etapas, 'DIV_MAT_CONTABILIDADE_IMH') !== null
  )
}

function trilhaMaterialIniciada(pedido: Pedido, etapas: WorkflowEtapa[]): boolean {
  return (
    historicoDaEtapa(pedido, etapas, 'DIV_MAT_CONFECCAO_SOLEMP') !== null ||
    historicoDaEtapa(pedido, etapas, 'DIV_MAT_FINANCAS') !== null ||
    historicoDaEtapa(pedido, etapas, 'DIV_MAT_EMPENHADO') !== null
  )
}

function etapaConcluidaNoHistorico(
  pedido: Pedido,
  etapas: WorkflowEtapa[],
  chave: string,
): boolean {
  return Boolean(historicoDaEtapa(pedido, etapas, chave)?.dataConclusao)
}

/** Processo encerrado quando cada trilha iniciada atingir sua etapa final.
 * Medicamento: encerra só com IMH.
 * Clínica: exige IMH e Empenhado para encerrar o PED;
 * se uma trilha não foi iniciada, o processo ainda não fecha pelo card da clínica
 * (mas a trilha iniciada pode ser concluída isoladamente). */
function isDivMaterialConcluida(
  pedido: Pedido,
  etapas: WorkflowEtapa[],
  isMedicamento: boolean,
): boolean {
  const imhIniciada = trilhaImhIniciada(pedido, etapas)
  const materialIniciada = trilhaMaterialIniciada(pedido, etapas)

  if (!imhIniciada && !materialIniciada) return false

  const imhFinalizada =
    etapaConcluidaNoHistorico(pedido, etapas, 'DIV_MAT_INDENIZADO') ||
    etapaConcluidaNoHistorico(pedido, etapas, 'DIV_MAT_CONTABILIDADE_IMH')
  const materialFinalizada = etapaConcluidaNoHistorico(
    pedido,
    etapas,
    'DIV_MAT_EMPENHADO',
  )

  if (isMedicamento) {
    return !imhIniciada || imhFinalizada
  }

  // Clínica: PED só encerra com as duas pontas (IMH + Empenhado).
  return imhFinalizada && materialFinalizada
}

function startNovaEtapa(
  etapa: WorkflowEtapa,
  responsavel: User | null,
  observacao: string,
): PedidoEtapaHistorico {
  return {
    etapaId: etapa.id,
    etapaNome: etapa.nome,
    responsavelId: responsavel?.id ?? null,
    responsavelNome: responsavel?.nome ?? null,
    dataInicio: nowIso(),
    dataConclusao: null,
    observacao,
    arquivos: [],
  }
}

function hasEtapaPendenteNotification(
  data: AppData,
  pedidoId: string,
  etapaChave: string,
  perfilDestino: string,
): boolean {
  return data.notificacoes.some(
    (n) =>
      n.pedidoId === pedidoId &&
      !n.lida &&
      n.tipo === 'ETAPA_PENDENTE' &&
      n.etapaChave === etapaChave &&
      n.perfilDestino === perfilDestino,
  )
}

function markEtapaNotificationsRead(
  data: AppData,
  pedidoId: string,
  etapaChave: string,
): void {
  data.notificacoes.forEach((n) => {
    if (
      n.pedidoId === pedidoId &&
      n.tipo === 'ETAPA_PENDENTE' &&
      n.etapaChave === etapaChave &&
      !n.lida
    ) {
      n.lida = true
    }
  })
}

/**
 * Notifica setores cadastrados quando há etapa ativa aguardando providência.
 */
export function notifySetoresEtapasAtivas(data: AppData, pedidoId: string): void {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido || pedido.concluido) return

  const ativas = pedido.etapasAtivasIds?.length
    ? pedido.etapasAtivasIds
    : [pedido.etapaAtualId]

  ativas.forEach((etapaId, index) => {
    const etapa = data.workflowEtapas.find((e) => e.id === etapaId)
    if (!etapa) return
    if (
      etapa.perfilResponsavel === 'CLINICA' ||
      etapa.perfilResponsavel === 'GESTOR' ||
      etapa.perfilResponsavel === 'ADMINISTRADOR' ||
      etapa.perfilResponsavel === 'CONSULTA'
    ) {
      return
    }

    const temUsuarios = data.usuarios.some(
      (u) => u.ativo && u.perfil === etapa.perfilResponsavel,
    )
    if (!temUsuarios) return

    if (
      hasEtapaPendenteNotification(
        data,
        pedidoId,
        etapa.chave,
        etapa.perfilResponsavel,
      )
    ) {
      return
    }

    data.notificacoes.push({
      id: `notif-etapa-${pedidoId}-${etapa.chave}-${Date.now()}-${index}`,
      tipo: 'ETAPA_PENDENTE',
      titulo: `${etapa.nome} — ${pedido.numero}`,
      mensagem: `O processo ${pedido.numero} aguarda providência na etapa ${etapa.nome}. Acesse a timeline para atuar.`,
      pedidoId,
      reversaoId: null,
      perfilDestino: etapa.perfilResponsavel,
      etapaChave: etapa.chave,
      lida: false,
      data: nowIso(),
    })
  })
}

/**
 * Notifica os setores de destino quando a clínica/medicamento corrige e reenvia
 * uma planilha que havia sido devolvida. Inclui o tempo gasto na correção.
 */
export function notifyPlanilhaCorrigidaReenviada(
  data: AppData,
  pedidoId: string,
  opts: {
    usuarioNome: string
    devolvidaEm: string | null | undefined
    agora?: string
  },
): void {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido || pedido.concluido) return

  const agora = opts.agora ?? nowIso()
  const tempo = formatDuracaoEntre(opts.devolvidaEm, agora)
  const tempoTxt = formatTempoCorrecaoPrefixo(tempo)
  const ativas = pedido.etapasAtivasIds?.length
    ? pedido.etapasAtivasIds
    : [pedido.etapaAtualId]

  ativas.forEach((etapaId, index) => {
    const etapa = data.workflowEtapas.find((e) => e.id === etapaId)
    if (!etapa) return
    if (
      etapa.perfilResponsavel === 'CLINICA' ||
      etapa.perfilResponsavel === 'MEDICAMENTO' ||
      etapa.perfilResponsavel === 'EMPENHADO' ||
      etapa.perfilResponsavel === 'GESTOR' ||
      etapa.perfilResponsavel === 'ADMINISTRADOR' ||
      etapa.perfilResponsavel === 'CONSULTA'
    ) {
      return
    }

    const temUsuarios = data.usuarios.some(
      (u) => u.ativo && u.perfil === etapa.perfilResponsavel,
    )
    if (!temUsuarios) return

    // Evita duplicar sino genérico + corrigida para a mesma etapa.
    markEtapaNotificationsRead(data, pedidoId, etapa.chave)

    data.notificacoes.push({
      id: `notif-corrigida-${pedidoId}-${etapa.chave}-${Date.now()}-${index}`,
      tipo: 'PLANILHA_CORRIGIDA_REENVIADA',
      titulo: `Planilha corrigida e reenviada — ${pedido.numero}`,
      mensagem: `${opts.usuarioNome} corrigiu e reenviou a planilha${tempoTxt}. O processo aguarda providência em ${etapa.nome}.`,
      pedidoId,
      reversaoId: null,
      perfilDestino: etapa.perfilResponsavel,
      etapaChave: etapa.chave,
      lida: false,
      data: agora,
    })
  })
}

/** Garante notificação ao financeiro quando o processo aguarda pagamento */
export function pushPagamentoPendenteNotification(data: AppData, pedidoId: string): void {
  notifySetoresEtapasAtivas(data, pedidoId)
}

export function syncPagamentoPendenteNotifications(data: AppData): AppData {
  data.pedidos.forEach((pedido) => {
    if (pedido.concluido) return
    notifySetoresEtapasAtivas(data, pedido.id)
  })
  return data
}

export function advancePedidoEtapa(
  data: AppData,
  pedidoId: string,
  usuario: User,
  observacao: string,
  etapaIdAvancar?: string,
): AppData {
  const pedidoIndex = data.pedidos.findIndex((p) => p.id === pedidoId)
  if (pedidoIndex < 0) throw new Error('Pedido não encontrado')

  const pedido = {
    ...data.pedidos[pedidoIndex],
    etapasAtivasIds: [...(data.pedidos[pedidoIndex].etapasAtivasIds ?? [])],
    etapasHistorico: data.pedidos[pedidoIndex].etapasHistorico.map((h) => ({ ...h })),
  }
  const etapas = [...data.workflowEtapas].sort((a, b) => a.ordem - b.ordem)
  const etapaId = etapaIdAvancar ?? pedido.etapaAtualId
  const etapaAtual = etapas.find((e) => e.id === etapaId)
  if (!etapaAtual) throw new Error('Etapa atual não encontrada')
  if (pedido.concluido) throw new Error('Processo já encerrado')

  const ativas = pedido.etapasAtivasIds.length > 0
    ? pedido.etapasAtivasIds
    : [pedido.etapaAtualId]

  const etapaEstaAtiva =
    ativas.some((id) => {
      if (id === etapaAtual.id) return true
      const resolvida = resolveEtapaFromRef(id, undefined, etapas)
      return resolvida?.id === etapaAtual.id || resolvida?.chave === etapaAtual.chave
    }) ||
    pedido.etapaAtualId === etapaAtual.id ||
    pedido.etapasHistorico.some((h) => {
      if (h.dataConclusao) return false
      const resolvida = resolveEtapaFromRef(h.etapaId, h.etapaNome, etapas)
      return resolvida?.id === etapaAtual.id || resolvida?.chave === etapaAtual.chave
    })

  if (!etapaEstaAtiva && etapaAtual.chave !== 'SOLICITACAO') {
    throw new Error('Esta etapa não está ativa no fluxo paralelo')
  }

  markEtapaNotificationsRead(data, pedidoId, etapaAtual.chave)

  let etapasHistorico = completeEtapaById(pedido, etapaAtual.id, observacao, etapas)
  // Remove a etapa concluída mesmo se o id no pedido estiver defasado.
  let etapasAtivasIds = ativas.filter((id) => {
    if (id === etapaAtual.id) return false
    const resolvida = resolveEtapaFromRef(id, undefined, etapas)
    return resolvida?.id !== etapaAtual.id && resolvida?.chave !== etapaAtual.chave
  })

  const proximasChaves =
    etapaAtual.chave === 'DIV_MAT_AUDITORIA'
      ? getDestinosEncaminhamentoAuditoria()
      : etapaAtual.chave === 'DIV_MAT_CONTABILIDADE_IMH'
        ? [] // Indenizado é concluído automaticamente abaixo
        : etapaAtual.chave === 'DIV_MAT_FINANCAS'
          ? [] // Empenhado é concluído automaticamente abaixo (só marca o fim do fluxo)
          : (() => {
              const unica = getProximaChaveNaDivisao(etapaAtual.chave)
              return unica && unica !== 'DIV_MAT_INDENIZADO' ? [unica] : []
            })()

  for (const proximaChave of proximasChaves) {
    const proxima = getEtapaByChave(etapas, proximaChave)
    if (!proxima) continue
    const responsavelProx = getResponsavelParaEtapa(proxima, data.usuarios, pedido.clinicaId)
    const histExistente = etapasHistorico.find((h) => h.etapaId === proxima.id)
    if (!histExistente) {
      const obsInicio =
        etapaAtual.chave === 'DIV_MAT_AUDITORIA' && proximaChave === 'DIV_MAT_CONFECCAO_SOLEMP'
          ? 'Planilha da Div. de Material encaminhada pela Auditoria — aguardando Confecção de Solemp.'
          : etapaAtual.chave === 'DIV_MAT_AUDITORIA' &&
              proximaChave === 'DIV_MAT_CONTABILIDADE_IMH'
            ? 'Planilha da Div. de Material encaminhada pela Auditoria — aguardando IMH.'
            : ''
      etapasHistorico = [
        ...etapasHistorico,
        startNovaEtapa(proxima, responsavelProx, obsInicio),
      ]
    } else if (histExistente.dataConclusao) {
      histExistente.dataConclusao = null
      histExistente.observacao =
        etapaAtual.chave === 'DIV_MAT_AUDITORIA'
          ? `Planilha reencaminhada pela Auditoria — aguardando ${proxima.nome}.`
          : histExistente.observacao
    }
    if (!etapasAtivasIds.includes(proxima.id)) {
      etapasAtivasIds.push(proxima.id)
    }
  }

  // IMH concluída → Indenizado já entra como concluído (mesma planilha).
  if (etapaAtual.chave === 'DIV_MAT_CONTABILIDADE_IMH') {
    const indenizado = getEtapaByChave(etapas, 'DIV_MAT_INDENIZADO')
    if (indenizado) {
      const agora = nowIso()
      const contabHist = etapasHistorico.find((h) => h.etapaId === etapaAtual.id)
      const histExistente = etapasHistorico.find((h) => h.etapaId === indenizado.id)
      const obsIndenizado =
        'Indenizado concluído automaticamente com a IMH — planilha recebida e finalizada.'
      if (!histExistente) {
        etapasHistorico = [
          ...etapasHistorico,
          {
            etapaId: indenizado.id,
            etapaNome: indenizado.nome,
            responsavelId: contabHist?.responsavelId ?? usuario.id,
            responsavelNome: contabHist?.responsavelNome ?? usuario.nome,
            dataInicio: agora,
            dataConclusao: agora,
            observacao: obsIndenizado,
            arquivos: [],
          },
        ]
      } else {
        histExistente.dataInicio = histExistente.dataInicio || agora
        histExistente.dataConclusao = agora
        histExistente.observacao = obsIndenizado
        histExistente.responsavelId =
          histExistente.responsavelId ?? contabHist?.responsavelId ?? usuario.id
        histExistente.responsavelNome =
          histExistente.responsavelNome ?? contabHist?.responsavelNome ?? usuario.nome
      }
      etapasAtivasIds = etapasAtivasIds.filter((id) => id !== indenizado.id)
    }
  }

  // Solemp em Rascunho concluída → Empenhado já entra como concluído (só marca o fim do fluxo).
  if (etapaAtual.chave === 'DIV_MAT_FINANCAS') {
    const empenhado = getEtapaByChave(etapas, 'DIV_MAT_EMPENHADO')
    if (empenhado) {
      const agora = nowIso()
      const financasHist = etapasHistorico.find((h) => h.etapaId === etapaAtual.id)
      const histExistente = etapasHistorico.find((h) => h.etapaId === empenhado.id)
      const obsEmpenhado =
        'Empenhado concluído automaticamente com o envio da Solemp em Rascunho — fluxo finalizado.'
      if (!histExistente) {
        etapasHistorico = [
          ...etapasHistorico,
          {
            etapaId: empenhado.id,
            etapaNome: empenhado.nome,
            responsavelId: financasHist?.responsavelId ?? usuario.id,
            responsavelNome: financasHist?.responsavelNome ?? usuario.nome,
            dataInicio: agora,
            dataConclusao: agora,
            observacao: obsEmpenhado,
            arquivos: [],
          },
        ]
      } else {
        histExistente.dataInicio = histExistente.dataInicio || agora
        histExistente.dataConclusao = agora
        histExistente.observacao = obsEmpenhado
        histExistente.responsavelId =
          histExistente.responsavelId ?? financasHist?.responsavelId ?? usuario.id
        histExistente.responsavelNome =
          histExistente.responsavelNome ?? financasHist?.responsavelNome ?? usuario.nome
      }
      // Não fica pendente: Empenhado só exibe o fim do fluxo.
      etapasAtivasIds = etapasAtivasIds.filter((id) => id !== empenhado.id)
    }
  }

  const pedidoParcial: Pedido = {
    ...pedido,
    etapasHistorico,
    etapasAtivasIds,
  }
  const clinica = data.clinicas.find((c) => c.id === pedido.clinicaId)
  const isMedicamento = isPedidoTimelineMedicamento(
    {
      ...pedidoParcial,
      clinica: clinica ?? {
        id: pedido.clinicaId,
        nome: '',
        responsavel: '',
        telefone: '',
        tipo: 'clinica',
      },
    },
    etapas,
  )
  const concluido = isDivMaterialConcluida(pedidoParcial, etapas, isMedicamento)
  const etapaPrincipalId = etapasAtivasIds[0] ?? etapaAtual.id
  const responsavelAtual =
    etapasAtivasIds.length > 0
      ? getResponsavelParaEtapa(
          etapas.find((e) => e.id === etapaPrincipalId)!,
          data.usuarios,
          pedido.clinicaId,
        )
      : null

  const atualizado: Pedido = {
    ...pedido,
    etapaAtualId: etapaPrincipalId,
    etapasAtivasIds,
    responsavelAtualId: responsavelAtual?.id ?? null,
    concluido,
    etapasHistorico,
  }

  data.pedidos[pedidoIndex] = atualizado

  const evento: HistoricoEvento = {
    id: `hist-${Date.now()}`,
    pedidoId,
    etapaId: etapaAtual.id,
    etapaNome: etapaAtual.nome,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    data: nowIso(),
    observacao,
  }
  data.historico.push(evento)

  arquivarEtapaConcluida(
    data,
    pedidoId,
    etapaAtual.chave,
    etapaAtual.nome,
    usuario,
    observacao,
  )

  if (etapaAtual.chave === 'DIV_MAT_FINANCAS') {
    const empenhado = getEtapaByChave(etapas, 'DIV_MAT_EMPENHADO')
    if (empenhado) {
      arquivarEtapaConcluida(
        data,
        pedidoId,
        empenhado.chave,
        empenhado.nome,
        usuario,
        'Empenhado concluído automaticamente com o envio da Solemp em Rascunho — fluxo finalizado.',
      )
    }
  }

  if (!atualizado.concluido) {
    notifySetoresEtapasAtivas(data, pedidoId)
  }

  return data
}

export function createSolempForPedido(
  data: AppData,
  pedidoId: string,
  numero: string,
  valor?: number,
): AppData {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) throw new Error('Pedido não encontrado')

  const existente = data.solemp.findIndex((s) => s.pedidoId === pedidoId)
  const solemp: Solemp = {
    id: existente >= 0 ? data.solemp[existente].id : `solemp-${Date.now()}`,
    numero,
    pedidoId,
    data: nowIso(),
    assinada: false,
    arquivoPDF: `solemp-${numero.replace(/\//g, '-')}.pdf`,
    valor: valor ?? pedido.valor,
  }

  if (existente >= 0) data.solemp[existente] = solemp
  else data.solemp.push(solemp)

  return data
}

export function createNotaFiscalForPedido(
  data: AppData,
  pedidoId: string,
  numero: string,
  options?: { empresaNome?: string; valor?: number },
): AppData {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) throw new Error('Pedido não encontrado')

  const existente = data.notasFiscais.findIndex((n) => n.pedidoId === pedidoId)
  const nf: NotaFiscal = {
    id: existente >= 0 ? data.notasFiscais[existente].id : `nf-${Date.now()}`,
    pedidoId,
    numero,
    serie: '1',
    valor: options?.valor ?? pedido.valor,
    arquivo: `nf-${pedido.numero}.pdf`,
    dataEmissao: nowIso(),
    empresaNome: options?.empresaNome?.trim() || undefined,
  }

  if (existente >= 0) data.notasFiscais[existente] = nf
  else data.notasFiscais.push(nf)

  return data
}

function cleanupAoSairEtapa(data: AppData, pedidoId: string, chaveEtapa: string): void {
  if (chaveEtapa === 'DIV_MAT_CONFECCAO_SOLEMP') {
    data.solemp = data.solemp.filter((s) => s.pedidoId !== pedidoId)
  }
}

export function revertPedidoEtapa(
  data: AppData,
  pedidoId: string,
  usuario: User,
  motivo: string,
  clinicaNome: string,
): AppData {
  const pedidoIndex = data.pedidos.findIndex((p) => p.id === pedidoId)
  if (pedidoIndex < 0) throw new Error('Pedido não encontrado')

  const pedido = { ...data.pedidos[pedidoIndex] }
  const etapas = [...data.workflowEtapas].sort((a, b) => a.ordem - b.ordem)
  const currentIndex = etapas.findIndex((e) => e.id === pedido.etapaAtualId)

  if (currentIndex <= 0) throw new Error('Não é possível voltar nesta etapa')
  if (pedido.concluido) throw new Error('Processo já encerrado')

  const etapaAtual = etapas[currentIndex]
  const etapaAnterior = etapas[currentIndex - 1]

  cleanupAoSairEtapa(data, pedidoId, etapaAtual.chave)

  let etapasHistorico = [...pedido.etapasHistorico]
  if (etapasHistorico.length > 0) {
    etapasHistorico.pop()
  }
  const anteriorHist = etapasHistorico[etapasHistorico.length - 1]
  if (anteriorHist) {
    anteriorHist.dataConclusao = null
    anteriorHist.observacao = `Etapa reaberta — ${motivo}`
  }

  const responsavel = getResponsavelParaEtapa(etapaAnterior, data.usuarios, pedido.clinicaId)

  data.pedidos[pedidoIndex] = {
    ...pedido,
    etapaAtualId: etapaAnterior.id,
    etapasAtivasIds: [etapaAnterior.id],
    responsavelAtualId: responsavel?.id ?? usuario.id,
    concluido: false,
    etapasHistorico,
    dataEntrega: etapaAnterior.chave === 'SOLICITACAO' ? null : pedido.dataEntrega,
  }

  const reversaoId = `rev-${Date.now()}`
  const reversao = {
    id: reversaoId,
    pedidoId,
    pedidoNumero: pedido.numero,
    clinicaNome,
    etapaDeNome: etapaAtual.nome,
    etapaParaNome: etapaAnterior.nome,
    motivo,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    data: nowIso(),
    status: 'PENDENTE' as const,
    respostaGestor: null,
    dataResposta: null,
    gestorNome: null,
  }

  if (!data.reversoes) data.reversoes = []
  data.reversoes.push(reversao)

  data.historico.push({
    id: `hist-${Date.now()}`,
    pedidoId,
    etapaId: etapaAtual.id,
    etapaNome: etapaAtual.nome,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    data: nowIso(),
    observacao: `Reversão: ${etapaAtual.nome} → ${etapaAnterior.nome}. Motivo: ${motivo}`,
  })

  data.notificacoes.push({
    id: `notif-${Date.now()}`,
    tipo: 'REVERSAO_TIMELINE',
    titulo: `Reversão de etapa — ${pedido.numero}`,
    mensagem: `${clinicaNome}: ${motivo}`,
    pedidoId,
    reversaoId,
    perfilDestino: null,
    etapaChave: null,
    lida: false,
    data: nowIso(),
  })

  notifySetoresEtapasAtivas(data, pedidoId)

  return data
}

function getEtapaAtivaPorChaves(
  pedido: Pedido,
  etapas: WorkflowEtapa[],
  chaves: string[],
): WorkflowEtapa | undefined {
  const ativas = pedido.etapasAtivasIds?.length
    ? pedido.etapasAtivasIds
    : [pedido.etapaAtualId]
  return etapas.find((e) => ativas.includes(e.id) && chaves.includes(e.chave))
}

const CHAVES_CADEIA_SOLEMP = [
  'DIV_MAT_CONFECCAO_SOLEMP',
  'DIV_MAT_FINANCAS',
  'DIV_MAT_EMPENHADO',
] as const

export interface AssinarSolempOptions {
  numero?: string
  valor?: number
  assinanteNome?: string
}

export function assinarSolempForPedido(
  data: AppData,
  pedidoId: string,
  usuario: User,
  options?: AssinarSolempOptions,
): AppData {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) throw new Error('Pedido não encontrado')

  const etapa = getEtapaAtivaPorChaves(pedido, data.workflowEtapas, [...CHAVES_CADEIA_SOLEMP])
  if (!etapa) {
    throw new Error('Nenhuma etapa ativa correspondente ao seu perfil neste processo')
  }

  if (etapa.chave === 'DIV_MAT_CONFECCAO_SOLEMP') {
    const numero = options?.numero?.trim()
    const valor = options?.valor
    if (!numero) throw new Error('Informe o número da SOLEMP')
    const numeroErro = validateSolempNumero(numero)
    if (numeroErro) throw new Error(numeroErro)
    if (valor == null || Number.isNaN(valor) || valor <= 0) {
      throw new Error('Informe o valor da SOLEMP')
    }

    data = createSolempForPedido(data, pedidoId, numero, valor)
    const solemp = data.solemp.find((s) => s.pedidoId === pedidoId)!
    solemp.assinada = true

    data = advancePedidoEtapa(
      data,
      pedidoId,
      usuario,
      `Confecção de Solemp registrada — SOLEMP ${solemp.numero} (${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Enviado para Solemp em Rascunho.`,
      etapa.id,
    )

    data.notificacoes.push({
      id: `notif-${Date.now()}`,
      tipo: 'SOLEMP_CRIADA',
      titulo: `Solemp em Rascunho — ${pedido.numero}`,
      mensagem: `${usuario.nome} confeccionou a SOLEMP ${solemp.numero} e enviou para Solemp em Rascunho.`,
      pedidoId,
      reversaoId: null,
      perfilDestino: null,
      etapaChave: etapa.chave,
      lida: false,
      data: nowIso(),
    })

    return data
  }

  if (etapa.chave === 'DIV_MAT_FINANCAS') {
    const solemp = data.solemp.find((s) => s.pedidoId === pedidoId)
    const solempRef = solemp?.numero ? ` — SOLEMP ${solemp.numero}` : ''

    data = advancePedidoEtapa(
      data,
      pedidoId,
      usuario,
      `Solemp em Rascunho: planilha enviada por ${usuario.nome}${solempRef}. Empenhado registrado como concluído.`,
      etapa.id,
    )

    data.notificacoes.push({
      id: `notif-${Date.now()}`,
      tipo: 'ETAPA_PENDENTE',
      titulo: `Fluxo finalizado — ${pedido.numero}`,
      mensagem: `${usuario.nome} enviou a planilha em Solemp em Rascunho. Empenhado ficou concluído (fim do fluxo).`,
      pedidoId,
      reversaoId: null,
      perfilDestino: null,
      etapaChave: etapa.chave,
      lida: false,
      data: nowIso(),
    })

    return data
  }

  if (etapa.chave === 'DIV_MAT_EMPENHADO') {
    throw new Error(
      'Empenhado não recebe planilha: ele já fica concluído ao enviar pela Solemp em Rascunho.',
    )
  }

  throw new Error('Este processo não está aguardando ação da Confecção de Solemp')
}

export function registrarPagamentoForPedido(
  data: AppData,
  pedidoId: string,
  solempId: string,
  usuario: User,
  options?: { notaFiscalNumero?: string; empresaNome?: string },
): AppData {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) throw new Error('Pedido não encontrado')

  const etapa = getEtapaAtivaPorChaves(pedido, data.workflowEtapas, ['DIV_MAT_FINANCAS'])
  if (!etapa) {
    throw new Error('Este processo não está na etapa Solemp em Rascunho')
  }

  const solemp = data.solemp.find((s) => s.id === solempId && s.pedidoId === pedidoId)
  if (!solemp) throw new Error('SOLEMP não encontrada ou não corresponde a este pedido')

  const notaFiscalNumero = options?.notaFiscalNumero?.trim()
  const empresaNome = options?.empresaNome?.trim()
  if (!notaFiscalNumero) throw new Error('Informe o número da nota fiscal')
  if (!empresaNome || empresaNome.length < 2) throw new Error('Informe o nome da empresa')

  data = createNotaFiscalForPedido(data, pedidoId, notaFiscalNumero, {
    empresaNome,
    valor: solemp.valor ?? pedido.valor,
  })

  data = {
    ...data,
    pedidos: data.pedidos.map((p) =>
      p.id === pedidoId
        ? { ...p, aguardandoEmpenho: false, aguardandoEmpenhoEm: undefined }
        : p,
    ),
  }

  data = advancePedidoEtapa(
    data,
    pedidoId,
    usuario,
    `Registro em Solemp em Rascunho — SOLEMP ${solemp.numero}, NF ${notaFiscalNumero}, empresa ${empresaNome}. Empenhado registrado como concluído.`,
    etapa.id,
  )

  data.notificacoes.push({
    id: `notif-${Date.now()}`,
    tipo: 'PAGAMENTO_REALIZADO',
    titulo: `Pagamento realizado — ${pedido.numero}`,
    mensagem: `${usuario.nome} confirmou o pagamento da SOLEMP ${solemp.numero} (NF ${notaFiscalNumero}). Empenhado ficou concluído (fim do fluxo).`,
    pedidoId,
    reversaoId: null,
    perfilDestino: null,
    etapaChave: etapa.chave,
    lida: false,
    data: nowIso(),
  })

  data.historico.push({
    id: `hist-${Date.now()}-pagamento`,
    pedidoId,
    etapaId: etapa.id,
    etapaNome: etapa.nome,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    data: nowIso(),
    observacao: `Pagamento da SOLEMP ${solemp.numero} confirmado em Solemp em Rascunho. NF ${notaFiscalNumero} — ${empresaNome}. Empenhado concluído automaticamente.`,
  })

  return data
}

/**
 * Marca Solemp em Rascunho como "Aguardando Empenhar".
 * Não avança o workflow nem abre o card Empenhado — só persiste a tarja.
 */
export function marcarAguardandoEmpenhoForPedido(
  data: AppData,
  pedidoId: string,
  usuario: User,
): AppData {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) throw new Error('Pedido não encontrado')

  const etapa = getEtapaAtivaPorChaves(pedido, data.workflowEtapas, ['DIV_MAT_FINANCAS'])
  if (!etapa) {
    throw new Error('Este processo não está na etapa Solemp em Rascunho')
  }

  if (pedido.aguardandoEmpenho) {
    return data
  }

  const now = nowIso()
  const pedidos = data.pedidos.map((p) => {
    if (p.id !== pedidoId) return p

    const historico = p.etapasHistorico.map((h) => {
      if (h.etapaId !== etapa.id && h.etapaNome !== etapa.nome) return h
      return {
        ...h,
        observacao: h.observacao
          ? `${h.observacao} · Aguardando Empenhar.`
          : 'Aguardando Empenhar — processo marcado sem avançar para Empenhado.',
      }
    })

    return {
      ...p,
      aguardandoEmpenho: true,
      aguardandoEmpenhoEm: now,
      etapasHistorico: historico,
    }
  })

  data = {
    ...data,
    pedidos,
    historico: [
      ...data.historico,
      {
        id: `hist-${Date.now()}-aguardando-empenho`,
        pedidoId,
        etapaId: etapa.id,
        etapaNome: etapa.nome,
        usuarioId: usuario.id,
        usuarioNome: usuario.nome,
        data: now,
        observacao:
          'Marcado como Aguardando Empenhar. Timeline permanece em Solemp em Rascunho.',
      },
    ],
    notificacoes: [
      ...data.notificacoes,
      {
        id: `notif-${Date.now()}-aguardando-empenho`,
        tipo: 'ETAPA_PENDENTE' as const,
        titulo: `Aguardando Empenhar — ${pedido.numero}`,
        mensagem: `${usuario.nome} marcou a SOLEMP como aguardando empenho. O processo permanece em Solemp em Rascunho.`,
        pedidoId,
        reversaoId: null,
        perfilDestino: null,
        etapaChave: etapa.chave,
        lida: false,
        data: now,
      },
    ],
  }

  return data
}
