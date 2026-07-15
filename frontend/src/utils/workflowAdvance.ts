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
  getEtapaByChave,
  getProximaChaveNaDivisao,
  isPedidoTimelineMedicamento,
} from '@/utils/timelineFlow'
import { arquivarEtapaConcluida } from '@/utils/processoArquivamento'
import { validateSolempNumero } from '@/utils/solemp'
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
    historicoDaEtapa(pedido, etapas, 'DIV_MAT_FINANCAS') !== null
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
 * Medicamento: encerra só com Contabilidade/IMH.
 * Clínica: exige Contabilidade/IMH e Solemp confeccionada para encerrar o PED;
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

  const imhFinalizada = etapaConcluidaNoHistorico(
    pedido,
    etapas,
    'DIV_MAT_CONTABILIDADE_IMH',
  )
  const materialFinalizada = etapaConcluidaNoHistorico(
    pedido,
    etapas,
    'DIV_MAT_FINANCAS',
  )

  if (isMedicamento) {
    return !imhIniciada || imhFinalizada
  }

  // Clínica: PED só encerra com as duas pontas (IMH + Finanças).
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

  if (!ativas.includes(etapaAtual.id) && etapaAtual.chave !== 'SOLICITACAO') {
    throw new Error('Esta etapa não está ativa no fluxo paralelo')
  }

  markEtapaNotificationsRead(data, pedidoId, etapaAtual.chave)

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

const PERFIL_PARA_ETAPA_SOLEMP: Partial<Record<User['perfil'], string>> = {
  CONFECCAO_SOLEMP: 'DIV_MAT_CONFECCAO_SOLEMP',
}

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

  const chavePerfil = PERFIL_PARA_ETAPA_SOLEMP[usuario.perfil]
  const etapa = chavePerfil
    ? getEtapaAtivaPorChaves(pedido, data.workflowEtapas, [chavePerfil])
    : getEtapaAtivaPorChaves(pedido, data.workflowEtapas, ['DIV_MAT_CONFECCAO_SOLEMP'])
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
      `Confecção de Solemp registrada — SOLEMP ${solemp.numero} (${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Enviado para Solemp confeccionada.`,
      etapa.id,
    )

    data.notificacoes.push({
      id: `notif-${Date.now()}`,
      tipo: 'SOLEMP_CRIADA',
      titulo: `SOLEMP confeccionada — ${pedido.numero}`,
      mensagem: `${usuario.nome} confeccionou a SOLEMP ${solemp.numero} e enviou para Solemp confeccionada.`,
      pedidoId,
      reversaoId: null,
      perfilDestino: null,
      etapaChave: etapa.chave,
      lida: false,
      data: nowIso(),
    })

    return data
  }

  throw new Error('Este processo não está aguardando confecção da SOLEMP')
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
    throw new Error('Este processo não está na etapa Solemp confeccionada')
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

  data = advancePedidoEtapa(
    data,
    pedidoId,
    usuario,
    `Registro em Solemp confeccionada — SOLEMP ${solemp.numero}, NF ${notaFiscalNumero}, empresa ${empresaNome}. Processo encerrado.`,
    etapa.id,
  )

  data.notificacoes.push({
    id: `notif-${Date.now()}`,
    tipo: 'PAGAMENTO_REALIZADO',
    titulo: `Pagamento realizado — ${pedido.numero}`,
    mensagem: `${usuario.nome} confirmou o pagamento da SOLEMP ${solemp.numero} (NF ${notaFiscalNumero}).`,
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
    observacao: `Pagamento da SOLEMP ${solemp.numero} confirmado em Solemp confeccionada. NF ${notaFiscalNumero} — ${empresaNome}.`,
  })

  return data
}
