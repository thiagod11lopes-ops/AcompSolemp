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
import { getProximaEtapa, getResponsavelParaEtapa } from '@/utils/workflow'

function nowIso(): string {
  return new Date().toISOString()
}

function completeEtapaAtual(pedido: Pedido, observacao: string): PedidoEtapaHistorico[] {
  const historico = [...pedido.etapasHistorico]
  const atual = historico.find((h) => h.dataConclusao === null)
  if (atual) {
    atual.dataConclusao = nowIso()
    if (observacao) atual.observacao = observacao
  }
  return historico
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

  const etapa = data.workflowEtapas.find((e) => e.id === pedido.etapaAtualId)
  if (!etapa || etapa.chave !== 'DIV_MAT_FINANCAS') return

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
    const etapa = data.workflowEtapas.find((e) => e.id === pedido.etapaAtualId)
    if (etapa && etapa.chave === 'DIV_MAT_FINANCAS') {
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
): AppData {
  const pedidoIndex = data.pedidos.findIndex((p) => p.id === pedidoId)
  if (pedidoIndex < 0) throw new Error('Pedido não encontrado')

  const pedido = { ...data.pedidos[pedidoIndex] }
  const etapas = [...data.workflowEtapas].sort((a, b) => a.ordem - b.ordem)
  const etapaAtual = etapas.find((e) => e.id === pedido.etapaAtualId)
  if (!etapaAtual) throw new Error('Etapa atual não encontrada')
  if (pedido.concluido) throw new Error('Processo já encerrado')

  const proxima = getProximaEtapa(etapaAtual, etapas)
  let etapasHistorico = completeEtapaAtual(pedido, observacao)

  let atualizado: Pedido
  if (!proxima) {
    atualizado = {
      ...pedido,
      responsavelAtualId: null,
      concluido: true,
      etapasHistorico,
    }
  } else {
    const responsavelProx = getResponsavelParaEtapa(proxima, data.usuarios, pedido.clinicaId)
    etapasHistorico = [
      ...etapasHistorico,
      startNovaEtapa(proxima, responsavelProx, ''),
    ]
    atualizado = {
      ...pedido,
      etapaAtualId: proxima.id,
      responsavelAtualId: responsavelProx?.id ?? null,
      concluido: false,
      etapasHistorico,
    }
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

  if (proxima?.chave === 'DIV_MAT_FINANCAS') {
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
  if (chaveEtapa === 'DIV_MAT_ASSINATURA_1' || chaveEtapa === 'DIV_MAT_ASSINATURA_2') {
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

export function assinarSolempForPedido(
  data: AppData,
  pedidoId: string,
  usuario: User,
): AppData {
  const pedido = data.pedidos.find((p) => p.id === pedidoId)
  if (!pedido) throw new Error('Pedido não encontrado')

  const etapa = data.workflowEtapas.find((e) => e.id === pedido.etapaAtualId)
  if (!etapa) throw new Error('Etapa não encontrada')

  if (etapa.chave === 'DIV_MAT_ASSINATURA_1') {
    let solemp = data.solemp.find((s) => s.pedidoId === pedidoId)
    if (!solemp) {
      solemp = {
        id: `solemp-${Date.now()}`,
        pedidoId,
        numero: `SLP-${pedido.numero.replace('PED-', '')}`,
        data: nowIso(),
        assinada: false,
        arquivoPDF: null,
      }
      data.solemp.push(solemp)
    }

    data = advancePedidoEtapa(
      data,
      pedidoId,
      usuario,
      `Assinatura 1 Solemp registrada — SOLEMP ${solemp.numero}.`,
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

  const etapa = data.workflowEtapas.find((e) => e.id === pedido.etapaAtualId)
  if (!etapa || etapa.chave !== 'DIV_MAT_FINANCAS') {
    throw new Error('Este processo não está na etapa Finanças')
  }

  const solemp = data.solemp.find((s) => s.id === solempId && s.pedidoId === pedidoId)
  if (!solemp) throw new Error('SOLEMP não encontrada ou não corresponde a este pedido')

  data = advancePedidoEtapa(
    data,
    pedidoId,
    usuario,
    `Pagamento registrado em Finanças — SOLEMP ${solemp.numero}. Processo encerrado.`,
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
