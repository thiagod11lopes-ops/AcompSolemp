import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@/types'
import { chatService } from '@/services/chatService'
import { useAuth } from '@/contexts/AuthContext'

export function useActiveChatUser(): User | null {
  const { gestorUser, clinicaUser, ordenadorUser, financeiroUser } = useAuth()
  return gestorUser ?? clinicaUser ?? ordenadorUser ?? financeiroUser ?? null
}

export function useChatUnreadCount() {
  const user = useActiveChatUser()
  return useQuery({
    queryKey: ['chat-unread', user?.id],
    queryFn: () => chatService.unreadCount(user!),
    enabled: Boolean(user?.id),
    staleTime: 0,
    refetchInterval: 2_500,
    refetchOnWindowFocus: true,
  })
}

export function useChatThreads(enabled: boolean) {
  const user = useActiveChatUser()
  return useQuery({
    queryKey: ['chat-threads', user?.id],
    queryFn: () => chatService.listThreads(user!),
    enabled: enabled && Boolean(user?.id),
    staleTime: 0,
    refetchInterval: enabled ? 4_000 : false,
  })
}

export function useChatMessages(threadId: string | null, enabled: boolean) {
  const user = useActiveChatUser()
  return useQuery({
    queryKey: ['chat-messages', threadId, user?.id],
    queryFn: () => chatService.listMessages(threadId!, user!),
    enabled: enabled && Boolean(threadId && user?.id),
    staleTime: 0,
    refetchInterval: enabled && threadId ? 2_500 : false,
  })
}

export function useSendChatMessage() {
  const user = useActiveChatUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ threadId, texto }: { threadId: string; texto: string }) => {
      if (!user) throw new Error('Usuário não autenticado.')
      return chatService.sendMessage(user, threadId, texto)
    },
    onSuccess: (_msg, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['chat-messages', vars.threadId] })
      void queryClient.invalidateQueries({ queryKey: ['chat-threads'] })
      void queryClient.invalidateQueries({ queryKey: ['chat-unread'] })
    },
  })
}

export function useMarkChatThreadRead() {
  const user = useActiveChatUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (threadId: string) => {
      if (!user) throw new Error('Usuário não autenticado.')
      return chatService.markThreadRead(user, threadId)
    },
    onSuccess: (_r, threadId) => {
      void queryClient.invalidateQueries({ queryKey: ['chat-messages', threadId] })
      void queryClient.invalidateQueries({ queryKey: ['chat-threads'] })
      void queryClient.invalidateQueries({ queryKey: ['chat-unread'] })
    },
  })
}

/** Marca conversa como lida ao abrir. */
export function useAutoMarkChatRead(threadId: string | null, open: boolean) {
  const mark = useMarkChatThreadRead()
  const markMutate = mark.mutate

  useEffect(() => {
    if (!open || !threadId) return
    markMutate(threadId)
  }, [threadId, open, markMutate])
}
