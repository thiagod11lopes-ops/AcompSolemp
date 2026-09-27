import { useEffect, useMemo, useRef, useState } from 'react'
import {
  alpha,
  Avatar,
  Badge,
  Box,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import {
  useActiveChatUser,
  useAutoMarkChatRead,
  useChatMessages,
  useChatThreads,
  useSendChatMessage,
} from '@/hooks/useChat'
import type { ChatThreadSummary } from '@/services/chatService'
import { formatRelative } from '@/utils/format'
import { getRoleLabel } from '@/mocks/seed'
import { premiumTokens } from '@/theme/tokens'

interface ChatDockProps {
  /** Preenche a altura disponível (ex.: painel da clínica). */
  fillHeight?: boolean
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

/** Bate-papo estilo WhatsApp: lista de conversas + grupo e particulares. */
export function ChatDock({ fillHeight = false }: ChatDockProps) {
  const theme = useTheme()
  const user = useActiveChatUser()
  const [threadId, setThreadId] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const accent = theme.palette.primary.main

  const { data: threads = [] } = useChatThreads(Boolean(user?.id))
  const { data: messages = [] } = useChatMessages(threadId, Boolean(user?.id && threadId))
  const send = useSendChatMessage()
  useAutoMarkChatRead(threadId ?? '', Boolean(user?.id && threadId))

  const activeThread = useMemo(
    () => threads.find((t) => t.threadId === threadId) ?? null,
    [threads, threadId],
  )
  const grupo = threads.find((t) => t.kind === 'grupo')
  const particulares = threads.filter((t) => t.kind === 'dm')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, threadId])

  const handleOpenThread = (id: string) => {
    setThreadId(id)
    setTexto('')
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  const handleBack = () => {
    setThreadId(null)
    setTexto('')
  }

  const handleSend = () => {
    const limpo = texto.trim()
    if (!limpo || !user || !threadId || send.isPending) return
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

  if (!user) return null

  const shellSx = {
    flexShrink: fillHeight ? 1 : 0,
    flex: fillHeight ? 1 : undefined,
    borderTop: fillHeight ? 'none' : `1px solid ${theme.palette.divider}`,
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: fillHeight ? 'none' : 340,
    minHeight: fillHeight ? 0 : 240,
    height: fillHeight ? '100%' : undefined,
    mt: fillHeight ? 0 : 0.5,
    bgcolor: alpha(theme.palette.background.paper, 0.96),
  }

  // ——— Tela da conversa (estilo WhatsApp) ———
  if (threadId && activeThread) {
    const isGrupo = activeThread.kind === 'grupo'
    return (
      <Box sx={shellSx}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1,
            py: 0.85,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(accent, 0.08),
          }}
        >
          <IconButton size="small" onClick={handleBack} aria-label="Voltar às conversas">
            <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: isGrupo ? alpha(premiumTokens.primary, 0.2) : alpha(accent, 0.18),
              color: isGrupo ? premiumTokens.primaryDark : accent,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {isGrupo ? (
              <GroupsRoundedIcon sx={{ fontSize: 18 }} />
            ) : (
              initialFromLabel(activeThread.label)
            )}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              noWrap
              sx={{
                fontWeight: 800,
                fontSize: '0.78rem',
                letterSpacing: '-0.02em',
                color: premiumTokens.primaryDark,
                lineHeight: 1.2,
              }}
            >
              {activeThread.label}
            </Typography>
            <Typography noWrap sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
              {isGrupo
                ? 'Grupo · todos os setores participam'
                : activeThread.subtitle}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            px: 1.1,
            py: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            backgroundImage: `radial-gradient(${alpha(theme.palette.text.primary, 0.035)} 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        >
          {messages.length === 0 ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ m: 'auto', textAlign: 'center', px: 1.5, lineHeight: 1.4 }}
            >
              {isGrupo
                ? 'Nenhuma mensagem no grupo. Escreva abaixo — todos os setores verão.'
                : 'Nenhuma mensagem nesta conversa particular. Só vocês dois veem o que for escrito.'}
            </Typography>
          ) : (
            messages.slice(-50).map((m) => {
              const mine = m.autorId === user.id
              return (
                <Box
                  key={m.id}
                  sx={{
                    alignSelf: mine ? 'flex-end' : 'flex-start',
                    maxWidth: '92%',
                  }}
                >
                  {!mine ? (
                    <Typography
                      sx={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: 'text.secondary',
                        mb: 0.15,
                        ml: 0.4,
                      }}
                    >
                      {m.autorNome}
                      {isGrupo ? ` · ${getRoleLabel(m.autorPerfil)}` : ''}
                    </Typography>
                  ) : null}
                  <Box
                    sx={{
                      px: 1.1,
                      py: 0.65,
                      borderRadius: mine ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      bgcolor: mine ? accent : alpha(theme.palette.text.primary, 0.06),
                      color: mine ? theme.palette.primary.contrastText : 'text.primary',
                      border: mine ? 'none' : `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.74rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: 1.35,
                      }}
                    >
                      {m.texto}
                    </Typography>
                    <Typography
                      sx={{
                        display: 'block',
                        mt: 0.2,
                        textAlign: 'right',
                        opacity: 0.7,
                        fontSize: '0.56rem',
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
          component="form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.85,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <InputBase
            inputRef={inputRef}
            fullWidth
            placeholder={isGrupo ? 'Mensagem para o grupo…' : 'Mensagem particular…'}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            sx={{
              fontSize: '0.8rem',
              px: 1.1,
              py: 0.45,
              borderRadius: 999,
              border: `1px solid ${alpha(accent, 0.22)}`,
              bgcolor: alpha(theme.palette.background.default, 0.65),
            }}
          />
          <IconButton
            type="submit"
            size="small"
            disabled={!texto.trim() || send.isPending}
            sx={{
              bgcolor: accent,
              color: theme.palette.primary.contrastText,
              width: 32,
              height: 32,
              '&:hover': { bgcolor: theme.palette.primary.dark },
              '&.Mui-disabled': { bgcolor: alpha(accent, 0.3), color: '#fff' },
            }}
          >
            <SendRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>
    )
  }

  // ——— Lista de conversas (estilo WhatsApp) ———
  return (
    <Box sx={shellSx}>
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(accent, 0.06),
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.85rem',
            letterSpacing: '-0.02em',
            color: premiumTokens.primaryDark,
            lineHeight: 1.2,
          }}
        >
          Bate-papo
        </Typography>
        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', mt: 0.15 }}>
          Grupo de todos · ou conversa particular com um setor
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {grupo ? (
          <List dense disablePadding>
            <ListItemButton
              onClick={() => handleOpenThread(grupo.threadId)}
              sx={{
                py: 1.1,
                px: 1.25,
                alignItems: 'flex-start',
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                bgcolor: alpha(premiumTokens.primary, 0.06),
                '&:hover': { bgcolor: alpha(premiumTokens.primary, 0.1) },
              }}
            >
              <Badge
                color="error"
                badgeContent={grupo.unread}
                invisible={!grupo.unread}
                sx={{ mr: 1.1, mt: 0.25 }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: alpha(premiumTokens.primary, 0.22),
                    color: premiumTokens.primaryDark,
                  }}
                >
                  <GroupsRoundedIcon sx={{ fontSize: 20 }} />
                </Avatar>
              </Badge>
              <ListItemText
                primary="Grupo — todos os setores"
                secondary={previewText(grupo)}
                slotProps={{
                  primary: {
                    sx: { fontWeight: 800, fontSize: '0.78rem', letterSpacing: '-0.015em' },
                  },
                  secondary: {
                    sx: { fontSize: '0.66rem', mt: 0.15 },
                    noWrap: true,
                  },
                }}
              />
            </ListItemButton>
          </List>
        ) : null}

        <Typography
          sx={{
            px: 1.5,
            pt: 1,
            pb: 0.35,
            fontSize: '0.62rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          Conversas particulares
        </Typography>
        <Typography sx={{ px: 1.5, pb: 0.75, fontSize: '0.6rem', color: 'text.secondary' }}>
          Só você e o setor escolhido veem a conversa
        </Typography>

        <List dense disablePadding>
          {particulares.length === 0 ? (
            <Typography
              sx={{ px: 1.5, py: 1.5, fontSize: '0.7rem', color: 'text.secondary' }}
            >
              Nenhum outro usuário cadastrado para conversa particular.
            </Typography>
          ) : (
            particulares.map((t) => (
              <ListItemButton
                key={t.threadId}
                onClick={() => handleOpenThread(t.threadId)}
                sx={{
                  py: 0.95,
                  px: 1.25,
                  alignItems: 'flex-start',
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                }}
              >
                <Badge
                  color="error"
                  badgeContent={t.unread}
                  invisible={!t.unread}
                  sx={{ mr: 1.1, mt: 0.2 }}
                >
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      fontSize: 13,
                      fontWeight: 800,
                      bgcolor: alpha(accent, 0.14),
                      color: accent,
                    }}
                  >
                    {t.peerPerfil ? (
                      initialFromLabel(t.label)
                    ) : (
                      <PersonRoundedIcon sx={{ fontSize: 18 }} />
                    )}
                  </Avatar>
                </Badge>
                <ListItemText
                  primary={t.label}
                  secondary={`${t.subtitle.replace(/^Particular · /, '')} · ${previewText(t)}`}
                  slotProps={{
                    primary: {
                      sx: { fontWeight: 700, fontSize: '0.76rem' },
                    },
                    secondary: {
                      sx: { fontSize: '0.64rem', mt: 0.1 },
                      noWrap: true,
                    },
                  }}
                />
              </ListItemButton>
            ))
          )}
        </List>
      </Box>

      {!threadId ? (
        <Box
          sx={{
            px: 1.25,
            py: 0.75,
            borderTop: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.background.default, 0.5),
          }}
        >
          <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', textAlign: 'center' }}>
            Toque no <strong>Grupo</strong> ou em um <strong>setor</strong> para abrir a conversa
          </Typography>
        </Box>
      ) : null}
    </Box>
  )
}
