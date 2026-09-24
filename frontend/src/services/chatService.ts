import type { AppData, ChatMessage, User, UserRole } from '@/types'
import { delay, loadAppData, loadFreshAppData, saveAppData, getRoleLabel } from '@/mocks/seed'

/** Setores disponíveis para conversa individual no bate-papo. */
export const CHAT_SETORES: UserRole[] = [
  'GESTOR',
  'CLINICA',
  'MEDICAMENTO',
  'AUDITORIA',
  'CONTABILIDADE_IMH',
  'CONFECCAO_SOLEMP',
  'FINANCEIRO',
  'EMPENHADO',
  'ASSINATURA_1_SOLEMP',
  'ASSINATURA_2_SOLEMP',
  'SDA',
  'ASSINANTE',
]

export const CHAT_GRUPO_THREAD_ID = 'grupo'

export function chatDmThreadId(a: UserRole, b: UserRole): string {
  const [x, y] = [a, b].sort((p, q) => p.localeCompare(q))
  return `dm:${x}:${y}`
}

export function parseChatDmPeer(threadId: string, meuPerfil: UserRole): UserRole | null {
  if (!threadId.startsWith('dm:')) return null
  const parts = threadId.split(':')
  if (parts.length !== 3) return null
  const [, a, b] = parts
  if (a === meuPerfil) return b as UserRole
  if (b === meuPerfil) return a as UserRole
  return null
}

export function chatThreadLabel(threadId: string, meuPerfil: UserRole): string {
  if (threadId === CHAT_GRUPO_THREAD_ID) return 'Grupo geral'
  const peer = parseChatDmPeer(threadId, meuPerfil)
  return peer ? getRoleLabel(peer) : 'Conversa'
}

function ensureChat(data: AppData): ChatMessage[] {
  if (!data.chatMensagens) data.chatMensagens = []
  return data.chatMensagens
}

export interface ChatThreadSummary {
  threadId: string
  kind: 'grupo' | 'dm'
  label: string
  peerPerfil: UserRole | null
  lastMessage: ChatMessage | null
  unread: number
}

function unreadInThread(mensagens: ChatMessage[], threadId: string, user: User): number {
  return mensagens.filter(
    (m) =>
      m.threadId === threadId &&
      m.autorId !== user.id &&
      !(m.lidasPor ?? []).includes(user.id),
  ).length
}

export const chatService = {
  async listThreads(user: User): Promise<ChatThreadSummary[]> {
    await delay(null, 120)
    const data = await loadFreshAppData()
    const mensagens = ensureChat(data)

    const grupoMsgs = mensagens
      .filter((m) => m.threadId === CHAT_GRUPO_THREAD_ID)
      .sort((a, b) => a.data.localeCompare(b.data))
    const threads: ChatThreadSummary[] = [
      {
        threadId: CHAT_GRUPO_THREAD_ID,
        kind: 'grupo',
        label: 'Grupo geral',
        peerPerfil: null,
        lastMessage: grupoMsgs.length ? grupoMsgs[grupoMsgs.length - 1] : null,
        unread: unreadInThread(mensagens, CHAT_GRUPO_THREAD_ID, user),
      },
    ]

    for (const peer of CHAT_SETORES) {
      if (peer === user.perfil) continue
      const threadId = chatDmThreadId(user.perfil, peer)
      const msgs = mensagens
        .filter((m) => m.threadId === threadId)
        .sort((a, b) => a.data.localeCompare(b.data))
      threads.push({
        threadId,
        kind: 'dm',
        label: getRoleLabel(peer),
        peerPerfil: peer,
        lastMessage: msgs.length ? msgs[msgs.length - 1] : null,
        unread: unreadInThread(mensagens, threadId, user),
      })
    }

    // Grupo primeiro; depois DMs com atividade, depois alfabetico
    const [grupo, ...dms] = threads
    dms.sort((a, b) => {
      const ta = a.lastMessage?.data ?? ''
      const tb = b.lastMessage?.data ?? ''
      if (ta !== tb) return tb.localeCompare(ta)
      return a.label.localeCompare(b.label, 'pt-BR')
    })
    return [grupo, ...dms]
  },

  async listMessages(threadId: string): Promise<ChatMessage[]> {
    await delay(null, 80)
    const data = await loadFreshAppData()
    return ensureChat(data)
      .filter((m) => m.threadId === threadId)
      .sort((a, b) => a.data.localeCompare(b.data))
  },

  async sendMessage(
    user: User,
    threadId: string,
    texto: string,
  ): Promise<ChatMessage> {
    await delay(null, 100)
    const limpo = texto.trim()
    if (!limpo) throw new Error('Digite uma mensagem.')
    if (limpo.length > 2000) throw new Error('Mensagem muito longa (máx. 2000 caracteres).')

    if (threadId !== CHAT_GRUPO_THREAD_ID) {
      const peer = parseChatDmPeer(threadId, user.perfil)
      if (!peer) throw new Error('Conversa inválida.')
    }

    const data = loadAppData()
    const mensagens = ensureChat(data)
    const msg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      threadId,
      autorId: user.id,
      autorNome: user.nome,
      autorPerfil: user.perfil,
      texto: limpo,
      data: new Date().toISOString(),
      lidasPor: [user.id],
    }
    mensagens.push(msg)
    saveAppData(data)
    return msg
  },

  async markThreadRead(user: User, threadId: string): Promise<void> {
    await delay(null, 40)
    const data = loadAppData()
    const mensagens = ensureChat(data)
    let changed = false
    for (const m of mensagens) {
      if (m.threadId !== threadId) continue
      if (m.autorId === user.id) continue
      if (!(m.lidasPor ?? []).includes(user.id)) {
        m.lidasPor = [...(m.lidasPor ?? []), user.id]
        changed = true
      }
    }
    if (changed) saveAppData(data)
  },

  async unreadCount(user: User): Promise<number> {
    await delay(null, 60)
    const data = await loadFreshAppData()
    const mensagens = ensureChat(data)
    return mensagens.filter(
      (m) => m.autorId !== user.id && !(m.lidasPor ?? []).includes(user.id),
    ).length
  },
}
