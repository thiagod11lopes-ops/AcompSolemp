import type {
  AppData,
  Pedido,
  PedidoAuditoriaAcao,
  PedidoAuditoriaEvento,
  User,
} from '@/types'

function nowIso(): string {
  return new Date().toISOString()
}

export function ensureAuditoriaArray(data: AppData): PedidoAuditoriaEvento[] {
  if (!Array.isArray(data.auditoria)) data.auditoria = []
  return data.auditoria
}

export function appendPedidoAuditoria(
  data: AppData,
  input: {
    pedidoId: string
    usuario: Pick<User, 'id' | 'nome'>
    acao: PedidoAuditoriaAcao
    titulo: string
    detalhe?: string | null
    etapaChave?: string | null
    etapaNome?: string | null
    alteracao?: string | null
    em?: string
  },
): PedidoAuditoriaEvento {
  const list = ensureAuditoriaArray(data)
  const evento: PedidoAuditoriaEvento = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pedidoId: input.pedidoId,
    em: input.em ?? nowIso(),
    usuarioId: input.usuario.id,
    usuarioNome: input.usuario.nome,
    acao: input.acao,
    titulo: input.titulo,
    detalhe: input.detalhe ?? null,
    etapaChave: input.etapaChave ?? null,
    etapaNome: input.etapaNome ?? null,
    alteracao: input.alteracao ?? null,
  }
  list.push(evento)
  return evento
}

function inferAcaoFromObservacao(obs: string): PedidoAuditoriaAcao {
  const t = obs.toLowerCase()
  if (t.includes('devolv')) return 'PLANILHA_DEVOLVIDA'
  if (t.includes('reenvi')) return 'PLANILHA_REENVIADA'
  if (t.includes('enviou') && t.includes('planilha')) return 'PLANILHA_ENVIADA'
  if (t.includes('solemp') || t.includes('confec')) return 'SOLEMP_CONFECCIONADA'
  if (t.includes('empenho') || t.includes(' ne ') || t.includes('aguardando ne')) {
    return 'NE_INFORMADA'
  }
  if (t.includes('nota fiscal') || t.includes(' nf ')) return 'NF_ANEXADA'
  if (t.includes('pagamento')) return 'PAGAMENTO_CONFIRMADO'
  if (t.includes('arquiv')) return 'ARQUIVADO'
  if (t.includes('iniciada') || t.includes('criado') || t.includes('timeline iniciada')) {
    return 'PEDIDO_CRIADO'
  }
  return 'ETAPA_AVANCADA'
}

const ACAO_LABEL: Record<PedidoAuditoriaAcao, string> = {
  PEDIDO_CRIADO: 'Pedido criado',
  ETAPA_AVANCADA: 'Etapa avançada',
  PLANILHA_ENVIADA: 'Planilha enviada',
  PLANILHA_DEVOLVIDA: 'Planilha devolvida',
  PLANILHA_REENVIADA: 'Planilha reenviada',
  SOLEMP_CONFECCIONADA: 'SOLEMP confeccionada',
  NE_INFORMADA: 'NE / empenho informado',
  NF_ANEXADA: 'Nota fiscal',
  PAGAMENTO_CONFIRMADO: 'Pagamento confirmado',
  ARQUIVADO: 'Arquivado',
  OUTRO: 'Registro',
}

export function labelAcaoAuditoria(acao: PedidoAuditoriaAcao): string {
  return ACAO_LABEL[acao] ?? acao
}

/** Lista unificada (auditoria + histórico legado + devoluções), mais recente primeiro. */
export function listAuditoriaForPedido(
  data: AppData,
  pedidoId: string,
): PedidoAuditoriaEvento[] {
  const out: PedidoAuditoriaEvento[] = []
  const seen = new Set<string>()

  const push = (ev: PedidoAuditoriaEvento) => {
    if (seen.has(ev.id)) return
    seen.add(ev.id)
    out.push(ev)
  }

  for (const ev of data.auditoria ?? []) {
    if (ev.pedidoId === pedidoId) push(ev)
  }

  for (const h of data.historico ?? []) {
    if (h.pedidoId !== pedidoId) continue
    push({
      id: `hist-as-aud-${h.id}`,
      pedidoId: h.pedidoId,
      em: h.data,
      usuarioId: h.usuarioId,
      usuarioNome: h.usuarioNome,
      acao: inferAcaoFromObservacao(h.observacao ?? ''),
      titulo: h.etapaNome || 'Etapa',
      detalhe: h.observacao,
      etapaNome: h.etapaNome,
      etapaChave: null,
      alteracao: null,
    })
  }

  const pedido = data.pedidos.find((p) => p.id === pedidoId) as Pedido | undefined
  if (pedido?.planilhaDevolucoes?.length) {
    for (const d of pedido.planilhaDevolucoes) {
      push({
        id: `dev-as-aud-${d.id}`,
        pedidoId,
        em: d.em,
        usuarioId: d.porUsuarioId,
        usuarioNome: d.porUsuarioNome,
        acao: 'PLANILHA_DEVOLVIDA',
        titulo: `Devolução → ${d.paraEtapaNome}`,
        detalhe: d.justificativa,
        etapaChave: d.paraEtapaChave,
        etapaNome: d.paraEtapaNome,
        alteracao: `${d.deEtapaNome} → ${d.paraEtapaNome}`,
      })
    }
  }

  const temSolempAud = out.some((e) => e.acao === 'SOLEMP_CONFECCIONADA')
  if (pedido?.solemp?.numero && !temSolempAud) {
    push({
      id: `syn-solemp-${pedido.id}-${pedido.solemp.numero}`,
      pedidoId,
      em: pedido.solemp.data || pedido.dataSolicitacao,
      usuarioId: '',
      usuarioNome: 'Sistema',
      acao: 'SOLEMP_CONFECCIONADA',
      titulo: `SOLEMP ${pedido.solemp.numero}`,
      detalhe:
        pedido.solemp.valor != null
          ? `Valor ${pedido.solemp.valor.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}`
          : null,
      alteracao: null,
    })
  }

  const temNeAud = out.some((e) => e.acao === 'NE_INFORMADA')
  if (pedido?.empenhoNumero && !temNeAud) {
    push({
      id: `syn-ne-${pedido.id}-${pedido.empenhoNumero}`,
      pedidoId,
      em: pedido.dataSolicitacao,
      usuarioId: '',
      usuarioNome: 'Sistema',
      acao: 'NE_INFORMADA',
      titulo: `Empenho / NE ${pedido.empenhoNumero}`,
      detalhe: null,
      alteracao: null,
    })
  }

  return out.sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime())
}

const DEMO_AUD_PREFIX = 'demo-aud-'
const FIC_AUD_PREFIX = 'fic-aud-'

function hoursAfter(iso: string, hours: number): string {
  const d = new Date(iso)
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

/**
 * Preenche auditoria rica para PEDs do modo exemplo / seed fictício,
 * para testar a aba Auditoria sem precisar percorrer o fluxo real.
 */
export function seedAuditoriaModoExemplo(data: AppData): number {
  const list = ensureAuditoriaArray(data)
  const kept = list.filter(
    (e) => !e.id.startsWith(DEMO_AUD_PREFIX) && !e.id.startsWith(FIC_AUD_PREFIX),
  )
  const novos: PedidoAuditoriaEvento[] = []

  const usuariosDemo = {
    clinica: { id: 'demo-u-clinica', nome: 'Clínica Exemplo' },
    medicamento: { id: 'demo-u-medicamento', nome: 'Medicamento Exemplo' },
    auditoria: { id: 'demo-u-auditoria', nome: 'Cap. Ana Paula' },
    imh: { id: 'demo-u-imh', nome: 'Ten. Roberto Lima' },
    solemp: { id: 'demo-u-solemp', nome: 'Sgt. Maria Souza' },
    financeiro: { id: 'demo-u-fin', nome: 'Ten. Santos' },
  }

  let seq = 0
  const push = (
    pedidoId: string,
    em: string,
    usuario: { id: string; nome: string },
    acao: PedidoAuditoriaAcao,
    titulo: string,
    detalhe?: string,
    alteracao?: string,
    etapaNome?: string,
  ) => {
    seq += 1
    const prefix = pedidoId.startsWith('fic-ped-') ? FIC_AUD_PREFIX : DEMO_AUD_PREFIX
    novos.push({
      id: `${prefix}${pedidoId}-${seq}`,
      pedidoId,
      em,
      usuarioId: usuario.id,
      usuarioNome: usuario.nome,
      acao,
      titulo,
      detalhe: detalhe ?? null,
      etapaNome: etapaNome ?? null,
      etapaChave: null,
      alteracao: alteracao ?? null,
    })
  }

  for (const pedido of data.pedidos) {
    const isFic = pedido.id.startsWith('fic-ped-')
    const isDemoCorr = pedido.id.startsWith('demo-ped-correcao')
    if (!isFic && !isDemoCorr) continue

    const base = pedido.dataSolicitacao || new Date().toISOString()
    const isPme = pedido.id.includes('-pme-') || pedido.id.includes('PME')
    const origem = isPme ? usuariosDemo.medicamento : usuariosDemo.clinica
    const solemp = data.solemp.find((s) => s.pedidoId === pedido.id)

    push(
      pedido.id,
      base,
      origem,
      'PEDIDO_CRIADO',
      `Pedido ${pedido.numero} criado`,
      pedido.observacoes || 'Abertura da timeline no modo exemplo.',
      undefined,
      'Solicitação da Clínica',
    )

    push(
      pedido.id,
      hoursAfter(base, 2),
      origem,
      'PLANILHA_ENVIADA',
      isPme ? 'Planilha PME enviada' : 'Planilha IMH / Div. Material enviada',
      `${pedido.quantidade} item(ns) · valor ${pedido.valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })}`,
      undefined,
      isPme ? 'IMH' : 'Auditoria',
    )

    if (isDemoCorr || pedido.planilhaDevolvidaEm) {
      push(
        pedido.id,
        pedido.planilhaDevolvidaEm || hoursAfter(base, 8),
        usuariosDemo.auditoria,
        'PLANILHA_DEVOLVIDA',
        'Planilha devolvida para correção',
        pedido.planilhaDevolvidaJustificativa ||
          'Ajuste de lote e quantidade na planilha (exemplo).',
        `Auditoria → ${origem.nome}`,
        'Auditoria',
      )
      continue
    }

    if (!isPme) {
      push(
        pedido.id,
        hoursAfter(base, 10),
        usuariosDemo.auditoria,
        'ETAPA_AVANCADA',
        'Auditoria concluída',
        'Planilha conferida e encaminhada.',
        'Auditoria → IMH / Confecção',
        'Auditoria',
      )
    }

    push(
      pedido.id,
      hoursAfter(base, 18),
      usuariosDemo.imh,
      'ETAPA_AVANCADA',
      'IMH / Contabilidade concluída',
      'Indenização registrada no modo exemplo.',
      undefined,
      'IMH',
    )

    if (solemp?.numero) {
      push(
        pedido.id,
        solemp.data || hoursAfter(base, 30),
        usuariosDemo.solemp,
        'SOLEMP_CONFECCIONADA',
        `SOLEMP ${solemp.numero}`,
        solemp.valor != null
          ? `Valor ${solemp.valor.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}`
          : 'Confecção registrada.',
        undefined,
        'Confecção de Solemp',
      )
    }

    if (pedido.empenhoNumero || pedido.concluido) {
      const ne = pedido.empenhoNumero || `NE-${pedido.numero.slice(-4)}`
      push(
        pedido.id,
        hoursAfter(base, 48),
        usuariosDemo.financeiro,
        'NE_INFORMADA',
        `Empenho / NE ${ne}`,
        pedido.concluido
          ? 'Pagamento confirmado e processo concluído (exemplo).'
          : 'Aguardando empenho na rede local (exemplo).',
        undefined,
        'Aguardando NE',
      )
    }

    if (pedido.concluido) {
      push(
        pedido.id,
        hoursAfter(base, 52),
        usuariosDemo.financeiro,
        'PAGAMENTO_CONFIRMADO',
        'Processo concluído',
        'Empenhado finalizado no modo exemplo.',
        undefined,
        'Empenhado',
      )
    }
  }

  data.auditoria = [...kept, ...novos]
  return novos.length
}
