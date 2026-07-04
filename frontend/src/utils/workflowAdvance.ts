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
import { getResponsavelParaEtapa } from '@/utils/workflow'
import {
  DIV_MATERIAL_CHAVES,
  getEtapaByChave,
  getProximaChaveNaDivisao,
} from '@/utils/timelineFlow'

function nowIso(): string {
  return new Date().toISOString()
}

function completeEtapaById(
  pedido: Pedido,
  etapaId: string,
  observacao: string,
): PedidoEtapaHistorico[] {
  const historico = pedido.etapasHistorico.map((h) => ({ ...h }))
  const atual = historico.find((h) => h.etapaId === etapaId && h.dataConclusao === null)
  if (atual) {
    atual.dataConclusao = nowIso()
    if (observacao) atual.observacao = observacao
  }
  return historico
}

function isDivMaterialConcluida(pedido: Pedido, etapas: WorkflowEtapa[]): boolean {
  return DIV_MATERIAL_CHAVES.every((chave) => {
    const etapa = etapas.find((e) => e.chave === chave)
    if (!etapa) return false
    const hist = pedido.etapasHistorico.find((h) => h.etapaId === etapa.id)
    return Boolean(hist?.dataConclusao)
  })
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

function hasPagamentoPendenteNotification(data: AppData, pedidoId: string): boolean {
  return data.notificacoes.some(
    (n) => n.pedidoId === pedidoId && n.tipo === 'PAGAMENTO_PENDENTE',
  )
}

/** Garante notificação ao financeiro quando o processo aguarda pagamento */
export function pushPagamentoPendenteNotification(data: AppData, pedidoId: string): void {
  if (hasPagamentoPendenteNotification(data, pedidoId)) return

  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido || pedido.concluido) return

  const ativas = pedido.etapasAtivasIds?.length
    ? pedido.etapasAtivasIds
    : [pedido.etapaAtualId]
  const etapa = data.workflowEtapas.find(
    (e) => ativas.includes(e.id) && e.chave === 'DIV_MAT_FINANCAS',
  )
  if (!etapa) return

  const solemp = data.solemp.find((s) => s.pedidoId === pedidoId)

  data.notificacoes.push({
    id: `notif-${Date.now()}-${pedidoId}`,
    tipo: 'PAGAMENTO_PENDENTE',
    titulo: `Pagamento pendente — ${pedido.numero}`,
    mensagem: `Processo na etapa Finanças (Div. de Material). SOLEMP ${solemp?.numero ?? '—'} aguardando pagamento.`,
    pedidoId,
    reversaoId: null,
    lida: false,
    data: nowIso(),
  })
}

export function syncPagamentoPendenteNotifications(data: AppData): AppData {
  data.pedidos.forEach((pedido) => {
    if (pedido.concluido) return
    const ativas = pedido.etapasAtivasIds?.length
      ? pedido.etapasAtivasIds
      : [pedido.etapaAtualId]
    const naFinancas = data.workflowEtapas.some(
      (e) => ativas.includes(e.id) && e.chave === 'DIV_MAT_FINANCAS',
    )
    if (naFinancas) {
      pushPagamentoPendenteNotification(data, pedido.id)
    }
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

  if (!ativas.includes(etapaAtual.id) && etapaAtual.chave !== 'SOLICITACAO') {
    throw new Error('Esta etapa não está ativa no fluxo paralelo')
  }

  let etapasHistorico = completeEtapaById(pedido, etapaAtual.id, observacao)
  let etapasAtivasIds = ativas.filter((id) => id !== etapaAtual.id)

  const proximaChave = getProximaChaveNaDivisao(etapaAtual.chave)
  const proxima = proximaChave ? getEtapaByChave(etapas, proximaChave) : null

  if (proxima) {
    const responsavelProx = getResponsavelParaEtapa(proxima, data.usuarios, pedido.clinicaId)
    const jaIniciada = etapasHistorico.some((h) => h.etapaId === proxima.id)
    if (!jaIniciada) {
      etapasHistorico = [
        ...etapasHistorico,
        startNovaEtapa(proxima, responsavelProx, ''),
      ]
    }
    if (!etapasAtivasIds.includes(proxima.id)) {
      etapasAtivasIds.push(proxima.id)
    }
  }

  const pedidoParcial: Pedido = {
    ...pedido,
    etapasHistorico,
    etapasAtivasIds,
  }
  const concluido = isDivMaterialConcluida(pedidoParcial, etapas)
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

  if (proxima?.chave === 'DIV_MAT_FINANCAS' || etapaAtual.chave === 'DIV_MAT_FINANCAS') {
    pushPagamentoPendenteNotification(data, pedidoId)
  }

  return data
}

export function createSolempForPedido(
  data: AppData,
  pedidoId: string,
  numero: string,
): AppData {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) throw new Error('Pedido não encontrado')

  const existente = data.solemp.findIndex((s) => s.pedidoId === pedidoId)
  const solemp: Solemp = {
    id: `solemp-${Date.now()}`,
    numero,
    pedidoId,
    data: nowIso(),
    assinada: false,
    arquivoPDF: `solemp-${numero.replace(/\//g, '-')}.pdf`,
  }

  if (existente >= 0) data.solemp[existente] = solemp
  else data.solemp.push(solemp)

  return data
}

export function createNotaFiscalForPedido(
  data: AppData,
  pedidoId: string,
  numero: string,
): AppData {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) throw new Error('Pedido não encontrado')

  const existente = data.notasFiscais.findIndex((n) => n.pedidoId === pedidoId)
  const nf: NotaFiscal = {
    id: existente >= 0 ? data.notasFiscais[existente].id : `nf-${Date.now()}`,
    pedidoId,
    numero,
    serie: '1',
    valor: pedido.valor,
    arquivo: `nf-${pedido.numero}.pdf`,
    dataEmissao: nowIso(),
  }

  if (existente >= 0) data.notasFiscais[existente] = nf
  else data.notasFiscais.push(nf)

  return data
}

function cleanupAoSairEtapa(data: AppData, pedidoId: string, chaveEtapa: string): void {
  if (
    chaveEtapa === 'DIV_MAT_CONFECCAO_SOLEMP' ||
    chaveEtapa === 'DIV_MAT_ASSINATURA_1' ||
    chaveEtapa === 'DIV_MAT_ASSINATURA_2'
  ) {
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
    lida: false,
    data: nowIso(),
  })

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

const PERFIL_PARA_ETAPA_SOLEMP: Partial<Record<User['perfil'], string>> = {
  CONFECCAO_SOLEMP: 'DIV_MAT_CONFECCAO_SOLEMP',
  ASSINATURA_1_SOLEMP: 'DIV_MAT_ASSINATURA_1',
  ASSINATURA_2_SOLEMP: 'DIV_MAT_ASSINATURA_2',
  ASSINANTE: 'DIV_MAT_ASSINATURA_1',
}

export function assinarSolempForPedido(
  data: AppData,
  pedidoId: string,
  usuario: User,
): AppData {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) throw new Error('Pedido não encontrado')

  const chavePerfil = PERFIL_PARA_ETAPA_SOLEMP[usuario.perfil]
  const etapa = chavePerfil
    ? getEtapaAtivaPorChaves(pedido, data.workflowEtapas, [chavePerfil])
    : getEtapaAtivaPorChaves(pedido, data.workflowEtapas, [
        'DIV_MAT_CONFECCAO_SOLEMP',
        'DIV_MAT_ASSINATURA_1',
        'DIV_MAT_ASSINATURA_2',
      ])
  if (!etapa) {
    throw new Error('Nenhuma etapa ativa correspondente ao seu perfil neste processo')
  }

  if (etapa.chave === 'DIV_MAT_CONFECCAO_SOLEMP') {
    let solemp = data.solemp.find((s) => s.pedidoId === pedidoId)
    if (!solemp) {
      solemp = {
        id: `solemp-${Date.now()}`,
        pedidoId,
        numero: `SLP-${pedido.numero.replace('PED-', '')}`,
        data: nowIso(),
        assinada: false,
        arquivoPDF: `solemp-${pedido.numero}.pdf`,
      }
      data.solemp.push(solemp)
    }

    data = advancePedidoEtapa(
      data,
      pedidoId,
      usuario,
      `Confecção de Solemp registrada — SOLEMP ${solemp.numero}.`,
      etapa.id,
    )

    data.notificacoes.push({
      id: `notif-${Date.now()}`,
      tipo: 'SOLEMP_CRIADA',
      titulo: `SOLEMP confeccionada — ${pedido.numero}`,
      mensagem: `${usuario.nome} confeccionou a SOLEMP ${solemp.numero}.`,
      pedidoId,
      reversaoId: null,
      lida: false,
      data: nowIso(),
    })

    return data
  }

  if (etapa.chave === 'DIV_MAT_ASSINATURA_1') {
    const solemp = data.solemp.find((s) => s.pedidoId === pedidoId)
    if (!solemp) throw new Error('SOLEMP não encontrada. Conclua a Confecção de Solemp primeiro.')

    data = advancePedidoEtapa(
      data,
      pedidoId,
      usuario,
      `Assinatura 1 Solemp registrada — SOLEMP ${solemp.numero}.`,
      etapa.id,
    )

    data.notificacoes.push({
      id: `notif-${Date.now()}`,
      tipo: 'ASSINATURA_REALIZADA',
      titulo: `Assinatura 1 Solemp — ${pedido.numero}`,
      mensagem: `${usuario.nome} registrou a Assinatura 1 da SOLEMP ${solemp.numero}.`,
      pedidoId,
      reversaoId: null,
      lida: false,
      data: nowIso(),
    })

    return data
  }

  if (etapa.chave === 'DIV_MAT_ASSINATURA_2') {
    const solemp = data.solemp.find((s) => s.pedidoId === pedidoId)
    if (!solemp) throw new Error('SOLEMP não encontrada para este pedido')

    solemp.assinada = true
    solemp.data = nowIso()

    data = advancePedidoEtapa(
      data,
      pedidoId,
      usuario,
      `Assinatura 2 Solemp registrada — SOLEMP ${solemp.numero} assinada.`,
      etapa.id,
    )

    data.notificacoes.push({
      id: `notif-${Date.now()}`,
      tipo: 'ASSINATURA_REALIZADA',
      titulo: `Assinatura 2 Solemp — ${pedido.numero}`,
      mensagem: `${usuario.nome} registrou a Assinatura 2 da SOLEMP ${solemp.numero}.`,
      pedidoId,
      reversaoId: null,
      lida: false,
      data: nowIso(),
    })

    return data
  }

  throw new Error('Este processo não está aguardando assinatura da SOLEMP')
}

export function registrarPagamentoForPedido(
  data: AppData,
  pedidoId: string,
  solempId: string,
  usuario: User,
): AppData {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) throw new Error('Pedido não encontrado')

  const etapa = getEtapaAtivaPorChaves(pedido, data.workflowEtapas, ['DIV_MAT_FINANCAS'])
  if (!etapa) {
    throw new Error('Este processo não está na etapa Finanças')
  }

  const solemp = data.solemp.find((s) => s.id === solempId && s.pedidoId === pedidoId)
  if (!solemp) throw new Error('SOLEMP não encontrada ou não corresponde a este pedido')

  data = advancePedidoEtapa(
    data,
    pedidoId,
    usuario,
    `Pagamento registrado em Finanças — SOLEMP ${solemp.numero}. Processo encerrado.`,
    etapa.id,
  )

  data.notificacoes.push({
    id: `notif-${Date.now()}`,
    tipo: 'PAGAMENTO_REALIZADO',
    titulo: `Pagamento realizado — ${pedido.numero}`,
    mensagem: `${usuario.nome} confirmou o pagamento da SOLEMP ${solemp.numero}.`,
    pedidoId,
    reversaoId: null,
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
    observacao: `Pagamento da SOLEMP ${solemp.numero} confirmado em Finanças.`,
  })

  return data
}
