import { useEffect, useMemo, useRef, useState } from 'react'
import {
  alpha,
  Avatar,
  Badge,
  Box,
  Dialog,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import ForumRoundedIcon from '@mui/icons-material/ForumRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import { ChatComposer, type ChatComposerMode } from '@/components/chat/ChatComposer'
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble'
import { CHAT_GRUPO_THREAD_ID, type ChatThreadSummary } from '@/services/chatService'
import {
  useActiveChatUser,
  useAutoMarkChatRead,
  useChatMessages,
  useChatThreads,
  useEditChatMessage,
  useSendChatMessage,
} from '@/hooks/useChat'
import type { ChatMessage } from '@/types'
import { premiumTokens } from '@/theme/tokens'

interface ChatModalProps {
  open: boolean
  onClose: () => void
}

function initialFromLabel(label: string): string {
  return label.trim().charAt(0).toUpperCase() || '?'
}

function previewText(thread: ChatThreadSummary): string {
  if (thread.lastMessage) {
    const t = thread.lastMessage.texto
    return t.length > 48 ? `${t.slice(0, 48)}…` : t
  }
  return thread.kind === 'grupo'
    ? 'Mensagens visíveis para todos os setores'
    : 'Toque para conversar em particular'
}

/** Bate-papo estilo WhatsApp: grupo aberto + conversas particulares entre setores. */
export function ChatModal({ open, onClose }: ChatModalProps) {
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'))
  const user = useActiveChatUser()
  const [threadId, setThreadId] = useState<string>(CHAT_GRUPO_THREAD_ID)
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const [texto, setTexto] = useState('')
  const [composerMode, setComposerMode] = useState<ChatComposerMode>({ type: 'send' })
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const { data: threads = [] } = useChatThreads(open)
  const { data: messages = [] } = useChatMessages(threadId, open)
  const send = useSendChatMessage()
  const edit = useEditChatMessage()
  useAutoMarkChatRead(threadId, open)

  const activeThread = useMemo(
    () => threads.find((t) => t.threadId === threadId) ?? null,
    [threads, threadId],
  )
  const grupo = threads.find((t) => t.kind === 'grupo')
  const particulares = threads.filter((t) => t.kind === 'dm')
  const isGrupo = activeThread?.kind === 'grupo'

  const resetComposer = () => {
    setTexto('')
    setComposerMode({ type: 'send' })
  }

  useEffect(() => {
    if (!open) return
    setThreadId(CHAT_GRUPO_THREAD_ID)
    setMobileShowThread(false)
    resetComposer()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, threadId])

  const handleSelectThread = (id: string) => {
    setThreadId(id)
    setMobileShowThread(true)
    resetComposer()
    setTimeout(() => inputRef.current?.focus(), 120)
  }

  const handleEdit = (message: ChatMessage) => {
    setComposerMode({ type: 'edit', message })
    setTexto(message.texto)
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const handleReply = (message: ChatMessage) => {
    setComposerMode({ type: 'reply', message })
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const handleSubmit = () => {
    const limpo = texto.trim()
    if (!limpo || !user) return

    if (composerMode.type === 'edit') {
      if (edit.isPending) return
      edit.mutate(
        { messageId: composerMode.message.id, texto: limpo },
        {
          onSuccess: () => {
            resetComposer()
            inputRef.current?.focus()
          },
        },
      )
      return
    }

    if (send.isPending) return
    send.mutate(
      {
        threadId,
        texto: limpo,
        respostaAId: composerMode.type === 'reply' ? composerMode.message.id : null,
      },
      {
        onSuccess: () => {
          resetComposer()
          inputRef.current?.focus()
        },
      },
    )
  }

  const accent = theme.palette.primary.main
  const showList = !isNarrow || !mobileShowThread
  const showChat = !isNarrow || mobileShowThread

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            height: { xs: '92vh', md: 620 },
            maxHeight: '92vh',
            borderRadius: 3.5,
            overflow: 'hidden',
            border: `1px solid ${alpha(accent, 0.18)}`,
            background: `
              radial-gradient(ellipse 90% 60% at 0% 0%, ${alpha(accent, 0.14)}, transparent 55%),
              radial-gradient(ellipse 70% 50% at 100% 100%, ${alpha(theme.palette.success.main, 0.08)}, transparent 50%),
              ${theme.palette.background.paper}
            `,
            boxShadow: premiumTokens.shadow,
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 2,
          py: 1.35,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.72),
          backdropFilter: 'blur(12px)',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(accent, 0.14),
            color: accent,
          }}
        >
          <ForumRoundedIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: '1.15rem' }}>
            Bate-papo
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Fechar">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {showList ? (
          <Box
            sx={{
              width: { xs: '100%', md: 300 },
              flexShrink: 0,
              borderRight: { md: `1px solid ${theme.palette.divider}` },
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              bgcolor: alpha(theme.palette.background.default, 0.35),
            }}
          >
            {grupo ? (
              <List dense disablePadding sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                <ListItemButton
                  selected={grupo.threadId === threadId}
                  onClick={() => handleSelectThread(grupo.threadId)}
                  sx={{
                    py: 1.35,
                    px: 1.5,
                    alignItems: 'flex-start',
                    bgcolor: alpha(premiumTokens.primary, 0.06),
                    '&.Mui-selected': {
                      bgcolor: alpha(premiumTokens.primary, 0.14),
                      '&:hover': { bgcolor: alpha(premiumTokens.primary, 0.18) },
                    },
                    '&:hover': { bgcolor: alpha(premiumTokens.primary, 0.1) },
                  }}
                >
                  <Badge
                    color="error"
                    badgeContent={grupo.unread}
                    invisible={!grupo.unread}
                    sx={{ mr: 1.25, mt: 0.25 }}
                  >
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: alpha(premiumTokens.primary, 0.22),
                        color: premiumTokens.primaryDark,
                      }}
                    >
                      <GroupsRoundedIcon />
                    </Avatar>
                  </Badge>
                  <ListItemText
                    primary="Grupo — todos os setores"
                    secondary={previewText(grupo)}
                    slotProps={{
                      primary: {
                        sx: { fontWeight: 800, fontSize: '1.04rem', letterSpacing: '-0.015em' },
                      },
                      secondary: {
                        sx: { fontSize: '0.83rem', mt: 0.2 },
                        noWrap: true,
                      },
                    }}
                  />
                </ListItemButton>
              </List>
            ) : null}

            <List dense sx={{ flex: 1, overflow: 'auto', py: 0, px: 1 }}>
              {particulares.length === 0 ? (
                <Typography sx={{ px: 1.5, py: 2, fontSize: '0.92rem', color: 'text.secondary' }}>
                  Nenhum outro usuário cadastrado para conversa particular.
                </Typography>
              ) : (
                particulares.map((t) => {
                  const selected = t.threadId === threadId
                  return (
                    <ListItemButton
                      key={t.threadId}
                      selected={selected}
                      onClick={() => handleSelectThread(t.threadId)}
                      sx={{
                        borderRadius: 2,
                        mb: 0.4,
                        py: 1.05,
                        '&.Mui-selected': {
                          bgcolor: alpha(accent, 0.12),
                          '&:hover': { bgcolor: alpha(accent, 0.16) },
                        },
                      }}
                    >
                      <Badge
                        color="error"
                        badgeContent={t.unread}
                        invisible={!t.unread}
                        sx={{ mr: 1.25 }}
                      >
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            fontSize: 15,
                            fontWeight: 800,
                            bgcolor: alpha(accent, selected ? 0.28 : 0.14),
                            color: accent,
                          }}
                        >
                          {initialFromLabel(t.label)}
                        </Avatar>
                      </Badge>
                      <ListItemText
                        primary={t.label}
                        secondary={`${t.subtitle.replace(/^Particular · /, '')} · ${previewText(t)}`}
                        slotProps={{
                          primary: { sx: { fontWeight: 700, fontSize: '0.99rem' } },
                          secondary: { sx: { fontSize: '0.83rem' }, noWrap: true },
                        }}
                      />
                    </ListItemButton>
                  )
                })
              )}
            </List>
          </Box>
        ) : null}

        {showChat ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
            <Box
              sx={{
                px: 2,
                py: 1.25,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderBottom: `1px solid ${theme.palette.divider}`,
                bgcolor: alpha(accent, 0.06),
              }}
            >
              {isNarrow ? (
                <IconButton
                  size="small"
                  onClick={() => setMobileShowThread(false)}
                  aria-label="Voltar às conversas"
                >
                  <ArrowBackRoundedIcon fontSize="small" />
                </IconButton>
              ) : null}
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: isGrupo ? alpha(premiumTokens.primary, 0.2) : alpha(accent, 0.16),
                  color: isGrupo ? premiumTokens.primaryDark : accent,
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                {isGrupo ? (
                  <GroupsRoundedIcon fontSize="small" />
                ) : (
                  initialFromLabel(activeThread?.label ?? '?')
                )}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '1.01rem' }} noWrap>
                  {activeThread?.label ?? 'Conversa'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.86rem' }}>
                  {isGrupo
                    ? 'Grupo · todos os setores participam'
                    : activeThread?.subtitle
                      ? activeThread.subtitle
                      : 'Conversa particular'}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                px: 2,
                py: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
                backgroundImage: `radial-gradient(${alpha(theme.palette.text.primary, 0.04)} 1px, transparent 1px)`,
                backgroundSize: '18px 18px',
              }}
            >
              {messages.length === 0 ? (
                <Box
                  sx={{
                    m: 'auto',
                    textAlign: 'center',
                    maxWidth: 300,
                    opacity: 0.9,
                  }}
                >
                  <ForumRoundedIcon sx={{ fontSize: 40, color: alpha(accent, 0.45), mb: 1 }} />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.45, fontSize: '1.01rem' }}
                  >
                    {isGrupo
                      ? 'Nenhuma mensagem no grupo. Escreva abaixo — todos os setores verão.'
                      : 'Nenhuma mensagem nesta conversa particular. Só vocês dois veem o que for escrito.'}
                  </Typography>
                </Box>
              ) : user ? (
                messages.map((m) => (
                  <ChatMessageBubble
                    key={m.id}
                    message={m}
                    allMessages={messages}
                    user={user}
                    isGrupo={Boolean(isGrupo)}
                    onEdit={handleEdit}
                    onReply={handleReply}
                  />
                ))
              ) : null}
              <div ref={bottomRef} />
            </Box>

            {user ? (
              <ChatComposer
                mode={composerMode}
                texto={texto}
                onTextoChange={setTexto}
                onSubmit={handleSubmit}
                onCancelMode={resetComposer}
                inputRef={inputRef}
                user={user}
                isGrupo={Boolean(isGrupo)}
                pending={send.isPending || edit.isPending}
              />
            ) : null}
          </Box>
        ) : null}
      </Box>
    </Dialog>
  )
}
