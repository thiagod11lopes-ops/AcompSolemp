import type { AppData, ChatMessage, User, UserRole } from '@/types'
import {
  delay,
  loadAppData,
  loadLatestAppData,
  saveAppData,
  getRoleLabel,
} from '@/mocks/seed'
import { useCloudAppDataSync } from '@/config/dataSource'

export const CHAT_GRUPO_THREAD_ID = 'grupo'

/** Janela para apagar para todos / editar (estilo WhatsApp ≈ 1 h). */
export const CHAT_EDIT_DELETE_WINDOW_MS = 60 * 60 * 1000

export const CHAT_DELETED_PLACEHOLDER = 'Esta mensagem foi apagada'

/** Conversa 1:1 entre dois usuários (ids ordenados). */
export function chatDmThreadId(userIdA: string, userIdB: string): string {
  const [x, y] = [userIdA, userIdB].sort((a, b) => a.localeCompare(b))
  return `dm:${x}:${y}`
}

export function parseChatDmPeerId(threadId: string, meuId: string): string | null {
  if (!threadId.startsWith('dm:')) return null
  const parts = threadId.split(':')
  if (parts.length !== 3) return null
  const [, a, b] = parts
  if (a === meuId) return b
  if (b === meuId) return a
  return null
}

/** Thread em que o usuário participa (grupo ou DM próprio). */
export function chatThreadInvolvesUser(threadId: string, userId: string): boolean {
  if (threadId === CHAT_GRUPO_THREAD_ID) return true
  return parseChatDmPeerId(threadId, userId) != null
}

export function isChatMessageVisibleTo(m: ChatMessage, userId: string): boolean {
  return !(m.apagadaPara ?? []).includes(userId)
}

export function canEditOrDeleteForEveryone(m: ChatMessage, userId: string): boolean {
  if (m.autorId !== userId) return false
  if (m.apagadaParaTodos) return false
  const age = Date.now() - new Date(m.data).getTime()
  return age >= 0 && age <= CHAT_EDIT_DELETE_WINDOW_MS
}

function ensureChat(data: AppData): ChatMessage[] {
  if (!data.chatMensagens) data.chatMensagens = []
  return data.chatMensagens
}

/** Participantes: gestores ativos + usuários cadastrados ativos. */
export function listChatParticipants(data: AppData, me: User): User[] {
  return (data.usuarios ?? [])
    .filter((u) => u.ativo && u.id !== me.id)
    .sort((a, b) => {
      const ga = a.perfil === 'GESTOR' || a.perfil === 'ADMINISTRADOR' ? 0 : 1
      const gb = b.perfil === 'GESTOR' || b.perfil === 'ADMINISTRADOR' ? 0 : 1
      if (ga !== gb) return ga - gb
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
}

export interface ChatThreadSummary {
  threadId: string
  kind: 'grupo' | 'dm'
  label: string
  subtitle: string
  peerUserId: string | null
  peerPerfil: UserRole | null
  lastMessage: ChatMessage | null
  unread: number
}

function visibleThreadMessages(
  mensagens: ChatMessage[],
  threadId: string,
  userId: string,
): ChatMessage[] {
  return mensagens
    .filter((m) => m.threadId === threadId && isChatMessageVisibleTo(m, userId))
    .sort((a, b) => a.data.localeCompare(b.data))
}

function unreadInThread(mensagens: ChatMessage[], threadId: string, user: User): number {
  return mensagens.filter(
    (m) =>
      m.threadId === threadId &&
      isChatMessageVisibleTo(m, user.id) &&
      !m.apagadaParaTodos &&
      m.autorId !== user.id &&
      !(m.lidasPor ?? []).includes(user.id),
  ).length
}

function peerLabel(user: User): string {
  const posto = user.posto?.trim()
  return posto ? `${posto} ${user.nome}` : user.nome
}

async function persistChatSend(data: AppData): Promise<void> {
  saveAppData(data)
  if (!useCloudAppDataSync()) return
  try {
    const { flushSupabaseAppDataSync } = await import('@/data/persistence/supabaseSync')
    await flushSupabaseAppDataSync()
  } catch {
    // Persistência local já gravou; a próxima sync cobre falhas transitórias.
  }
}

function findOwnedMessage(
  mensagens: ChatMessage[],
  messageId: string,
  user: User,
): ChatMessage {
  const msg = mensagens.find((m) => m.id === messageId)
  if (!msg) throw new Error('Mensagem não encontrada.')
  if (!chatThreadInvolvesUser(msg.threadId, user.id)) {
    throw new Error('Sem permissão nesta conversa.')
  }
  return msg
}

export const chatService = {
  async listThreads(user: User): Promise<ChatThreadSummary[]> {
    await delay(null, 80)
    const data = await loadLatestAppData()
    const mensagens = ensureChat(data)
    const peers = listChatParticipants(data, user)

    const grupoMsgs = visibleThreadMessages(mensagens, CHAT_GRUPO_THREAD_ID, user.id)

    const threads: ChatThreadSummary[] = [
      {
        threadId: CHAT_GRUPO_THREAD_ID,
        kind: 'grupo',
        label: 'Grupo — todos os setores',
        subtitle: 'Todos podem ler e escrever',
        peerUserId: null,
        peerPerfil: null,
        lastMessage: grupoMsgs.length ? grupoMsgs[grupoMsgs.length - 1] : null,
        unread: unreadInThread(mensagens, CHAT_GRUPO_THREAD_ID, user),
      },
    ]

    for (const peer of peers) {
      const threadId = chatDmThreadId(user.id, peer.id)
      const msgs = visibleThreadMessages(mensagens, threadId, user.id)
      const setor = getRoleLabel(peer.perfil)
      threads.push({
        threadId,
        kind: 'dm',
        label: peerLabel(peer),
        subtitle: `Particular · ${setor}`,
        peerUserId: peer.id,
        peerPerfil: peer.perfil,
        lastMessage: msgs.length ? msgs[msgs.length - 1] : null,
        unread: unreadInThread(mensagens, threadId, user),
      })
    }

    const [grupo, ...dms] = threads
    dms.sort((a, b) => {
      const ta = a.lastMessage?.data ?? ''
      const tb = b.lastMessage?.data ?? ''
      if (ta !== tb) return tb.localeCompare(ta)
      return a.label.localeCompare(b.label, 'pt-BR')
    })
    return [grupo, ...dms]
  },

  async listMessages(threadId: string, user: User): Promise<ChatMessage[]> {
    await delay(null, 50)
    if (!chatThreadInvolvesUser(threadId, user.id)) return []
    const data = await loadLatestAppData()
    return visibleThreadMessages(ensureChat(data), threadId, user.id)
  },

  async sendMessage(
    user: User,
    threadId: string,
    texto: string,
    respostaAId?: string | null,
  ): Promise<ChatMessage> {
    await delay(null, 60)
    const limpo = texto.trim()
    if (!limpo) throw new Error('Digite uma mensagem.')
    if (limpo.length > 2000) throw new Error('Mensagem muito longa (máx. 2000 caracteres).')

    if (threadId !== CHAT_GRUPO_THREAD_ID) {
      const peerId = parseChatDmPeerId(threadId, user.id)
      if (!peerId) throw new Error('Conversa inválida.')
      const dataCheck = loadAppData()
      const peer = dataCheck.usuarios.find((u) => u.id === peerId && u.ativo)
      if (!peer) throw new Error('Participante não encontrado.')
    }

    const data = loadAppData()
    const mensagens = ensureChat(data)

    let respostaValida: string | null = null
    if (respostaAId) {
      const alvo = mensagens.find((m) => m.id === respostaAId && m.threadId === threadId)
      if (alvo && isChatMessageVisibleTo(alvo, user.id) && !alvo.apagadaParaTodos) {
        respostaValida = alvo.id
      }
    }

    const msg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      threadId,
      autorId: user.id,
      autorNome: user.nome,
      autorPerfil: user.perfil,
      texto: limpo,
      data: new Date().toISOString(),
      lidasPor: [user.id],
      apagadaPara: [],
      apagadaParaTodos: false,
      editadoEm: null,
      respostaAId: respostaValida,
    }
    mensagens.push(msg)
    await persistChatSend(data)
    return msg
  },

  async editMessage(user: User, messageId: string, texto: string): Promise<ChatMessage> {
    await delay(null, 60)
    const limpo = texto.trim()
    if (!limpo) throw new Error('Digite uma mensagem.')
    if (limpo.length > 2000) throw new Error('Mensagem muito longa (máx. 2000 caracteres).')

    const data = loadAppData()
    const mensagens = ensureChat(data)
    const msg = findOwnedMessage(mensagens, messageId, user)
    if (!canEditOrDeleteForEveryone(msg, user.id)) {
      throw new Error('Não é possível editar esta mensagem.')
    }
    msg.texto = limpo
    msg.editadoEm = new Date().toISOString()
    await persistChatSend(data)
    return msg
  },

  async deleteMessageForMe(user: User, messageId: string): Promise<void> {
    await delay(null, 40)
    const data = loadAppData()
    const mensagens = ensureChat(data)
    const msg = findOwnedMessage(mensagens, messageId, user)
    const lista = msg.apagadaPara ?? []
    if (!lista.includes(user.id)) {
      msg.apagadaPara = [...lista, user.id]
      await persistChatSend(data)
    }
  },

  async deleteMessageForEveryone(user: User, messageId: string): Promise<ChatMessage> {
    await delay(null, 40)
    const data = loadAppData()
    const mensagens = ensureChat(data)
    const msg = findOwnedMessage(mensagens, messageId, user)
    if (!canEditOrDeleteForEveryone(msg, user.id)) {
      throw new Error('Só é possível apagar para todos dentro de 1 hora.')
    }
    msg.apagadaParaTodos = true
    msg.texto = CHAT_DELETED_PLACEHOLDER
    msg.editadoEm = null
    msg.respostaAId = null
    await persistChatSend(data)
    return msg
  },

  async markThreadRead(user: User, threadId: string): Promise<void> {
    await delay(null, 30)
    if (!chatThreadInvolvesUser(threadId, user.id)) return
    const data = loadAppData()
    const mensagens = ensureChat(data)
    let changed = false
    for (const m of mensagens) {
      if (m.threadId !== threadId) continue
      if (!isChatMessageVisibleTo(m, user.id)) continue
      if (m.apagadaParaTodos) continue
      if (m.autorId === user.id) continue
      if (!(m.lidasPor ?? []).includes(user.id)) {
        m.lidasPor = [...(m.lidasPor ?? []), user.id]
        changed = true
      }
    }
    if (changed) await persistChatSend(data)
  },

  /**
   * Conta mensagens não lidas apenas nas conversas do usuário
   * (grupo geral + DMs em que ele participa) — alimenta o badge do ícone.
   */
  async unreadCount(user: User): Promise<number> {
    const data = await loadLatestAppData()
    const mensagens = ensureChat(data)
    return mensagens.filter(
      (m) =>
        chatThreadInvolvesUser(m.threadId, user.id) &&
        isChatMessageVisibleTo(m, user.id) &&
        !m.apagadaParaTodos &&
        m.autorId !== user.id &&
        !(m.lidasPor ?? []).includes(user.id),
    ).length
  },
}
