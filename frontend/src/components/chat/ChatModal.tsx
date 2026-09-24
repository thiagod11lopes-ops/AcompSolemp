import { useEffect, useMemo, useRef, useState } from 'react'
import {
  alpha,
  Avatar,
  Badge,
  Box,
  Button,
  Dialog,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import ForumRoundedIcon from '@mui/icons-material/ForumRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import { formatRelative } from '@/utils/format'
import { getRoleLabel } from '@/mocks/seed'
import { CHAT_GRUPO_THREAD_ID } from '@/services/chatService'
import {
  useActiveChatUser,
  useAutoMarkChatRead,
  useChatMessages,
  useChatThreads,
  useSendChatMessage,
} from '@/hooks/useChat'
import { premiumTokens } from '@/theme/tokens'

interface ChatModalProps {
  open: boolean
  onClose: () => void
}

function initialFromLabel(label: string): string {
  return label.trim().charAt(0).toUpperCase() || '?'
}

export function ChatModal({ open, onClose }: ChatModalProps) {
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'))
  const user = useActiveChatUser()
  const [threadId, setThreadId] = useState<string>(CHAT_GRUPO_THREAD_ID)
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const [texto, setTexto] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const { data: threads = [] } = useChatThreads(open)
  const { data: messages = [] } = useChatMessages(threadId, open)
  const send = useSendChatMessage()
  useAutoMarkChatRead(threadId, open)

  const activeThread = useMemo(
    () => threads.find((t) => t.threadId === threadId) ?? null,
    [threads, threadId],
  )

  useEffect(() => {
    if (!open) return
    setThreadId(CHAT_GRUPO_THREAD_ID)
    setMobileShowThread(false)
    setTexto('')
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, threadId])

  const handleSelectThread = (id: string) => {
    setThreadId(id)
    setMobileShowThread(true)
    setTimeout(() => inputRef.current?.focus(), 120)
  }

  const handleSend = () => {
    const limpo = texto.trim()
    if (!limpo || !user || send.isPending) return
    send.mutate(
      { threadId, texto: limpo },
      {
        onSuccess: () => {
          setTexto('')
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
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            Bate-papo
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Gestor e usuários cadastrados · individual ou grupo
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
              width: { xs: '100%', md: 280 },
              flexShrink: 0,
              borderRight: { md: `1px solid ${theme.palette.divider}` },
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              bgcolor: alpha(theme.palette.background.default, 0.35),
            }}
          >
            <Box sx={{ p: 1.5, pb: 1 }}>
              <Button
                fullWidth
                variant="contained"
                disableElevation
                startIcon={<GroupsRoundedIcon />}
                onClick={() => handleSelectThread(CHAT_GRUPO_THREAD_ID)}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 800,
                  py: 1.1,
                  background: `linear-gradient(135deg, ${accent} 0%, ${theme.palette.primary.dark} 100%)`,
                }}
              >
                Grupo geral
              </Button>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.75, px: 0.25 }}
              >
                Todos os cadastrados leem e escrevem no mesmo canal
              </Typography>
            </Box>

            <Typography
              variant="overline"
              sx={{ px: 2, pt: 0.5, fontWeight: 800, letterSpacing: 1, color: 'text.secondary' }}
            >
              Participantes
            </Typography>

            <List dense sx={{ flex: 1, overflow: 'auto', py: 0.5, px: 1 }}>
              {threads
                .filter((t) => t.kind === 'dm')
                .map((t) => {
                  const selected = t.threadId === threadId
                  const preview = t.lastMessage
                    ? t.lastMessage.texto.slice(0, 42) +
                      (t.lastMessage.texto.length > 42 ? '…' : '')
                    : t.subtitle
                  return (
                    <ListItemButton
                      key={t.threadId}
                      selected={selected}
                      onClick={() => handleSelectThread(t.threadId)}
                      sx={{
                        borderRadius: 2,
                        mb: 0.4,
                        py: 1,
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
                            width: 34,
                            height: 34,
                            fontSize: 13,
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
                        secondary={preview}
                        slotProps={{
                          primary: { sx: { fontWeight: 700, fontSize: '0.86rem' } },
                          secondary: { sx: { fontSize: '0.72rem' }, noWrap: true },
                        }}
                      />
                    </ListItemButton>
                  )
                })}
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
              }}
            >
              {isNarrow ? (
                <IconButton
                  size="small"
                  onClick={() => setMobileShowThread(false)}
                  aria-label="Voltar"
                >
                  <ArrowBackRoundedIcon fontSize="small" />
                </IconButton>
              ) : null}
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: alpha(accent, 0.16),
                  color: accent,
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                {activeThread?.kind === 'grupo' ? (
                  <GroupsRoundedIcon fontSize="small" />
                ) : (
                  initialFromLabel(activeThread?.label ?? '?')
                )}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                  {activeThread?.label ?? 'Conversa'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {activeThread?.kind === 'grupo'
                    ? 'Canal aberto para gestor e cadastrados'
                    : activeThread?.subtitle
                      ? `${activeThread.subtitle}`
                      : 'Conversa individual'}
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
                    maxWidth: 280,
                    opacity: 0.85,
                  }}
                >
                  <ForumRoundedIcon sx={{ fontSize: 40, color: alpha(accent, 0.45), mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma mensagem ainda. Seja o primeiro a escrever.
                  </Typography>
                </Box>
              ) : (
                messages.map((m) => {
                  const mine = m.autorId === user?.id
                  return (
                    <Box
                      key={m.id}
                      sx={{
                        alignSelf: mine ? 'flex-end' : 'flex-start',
                        maxWidth: '78%',
                        animation: 'chatIn 220ms ease both',
                        '@keyframes chatIn': {
                          from: { opacity: 0, transform: 'translateY(6px)' },
                          to: { opacity: 1, transform: 'translateY(0)' },
                        },
                      }}
                    >
                      {!mine ? (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mb: 0.35,
                            ml: 0.75,
                            fontWeight: 700,
                            color: 'text.secondary',
                          }}
                        >
                          {m.autorNome} · {getRoleLabel(m.autorPerfil)}
                        </Typography>
                      ) : null}
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1.05,
                          borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          bgcolor: mine ? accent : alpha(theme.palette.text.primary, 0.06),
                          color: mine ? theme.palette.primary.contrastText : 'text.primary',
                          border: mine ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                          boxShadow: mine ? `0 6px 18px ${alpha(accent, 0.28)}` : 'none',
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {m.texto}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 0.45,
                            textAlign: 'right',
                            opacity: 0.72,
                            fontSize: '0.65rem',
                          }}
                        >
                          {formatRelative(m.data)}
                        </Typography>
                      </Box>
                    </Box>
                  )
                })
              )}
              <div ref={bottomRef} />
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderTop: `1px solid ${theme.palette.divider}`,
                bgcolor: alpha(theme.palette.background.paper, 0.85),
                backdropFilter: 'blur(10px)',
              }}
            >
              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.25,
                  py: 0.6,
                  borderRadius: 999,
                  border: `1px solid ${alpha(accent, 0.22)}`,
                  bgcolor: alpha(theme.palette.background.default, 0.55),
                }}
              >
                <InputBase
                  inputRef={inputRef}
                  fullWidth
                  placeholder="Escreva uma mensagem…"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  sx={{ fontSize: '0.9rem', px: 0.5 }}
                />
                <IconButton
                  type="submit"
                  color="primary"
                  disabled={!texto.trim() || send.isPending}
                  sx={{
                    bgcolor: accent,
                    color: theme.palette.primary.contrastText,
                    '&:hover': { bgcolor: theme.palette.primary.dark },
                    '&.Mui-disabled': { bgcolor: alpha(accent, 0.3), color: '#fff' },
                  }}
                >
                  <SendRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>
        ) : null}
      </Box>
    </Dialog>
  )
}
