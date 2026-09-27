import { useEffect, useRef, useState } from 'react'
import {
  alpha,
  Badge,
  Box,
  IconButton,
  InputBase,
  Typography,
  useTheme,
} from '@mui/material'
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded'
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import { ChatModal } from '@/components/chat/ChatModal'
import {
  useActiveChatUser,
  useAutoMarkChatRead,
  useChatMessages,
  useChatUnreadCount,
  useSendChatMessage,
} from '@/hooks/useChat'
import { CHAT_GRUPO_THREAD_ID } from '@/services/chatService'
import { formatRelative } from '@/utils/format'
import { premiumTokens } from '@/theme/tokens'

interface ChatDockProps {
  /** Preenche a altura disponível (ex.: painel da clínica). */
  fillHeight?: boolean
}

/** Bate-papo sempre aberto (grupo geral), com atalho para o modal completo. */
export function ChatDock({ fillHeight = false }: ChatDockProps) {
  const theme = useTheme()
  const user = useActiveChatUser()
  const [texto, setTexto] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const accent = theme.palette.primary.main

  const { data: unread = 0 } = useChatUnreadCount()
  const { data: messages = [] } = useChatMessages(CHAT_GRUPO_THREAD_ID, Boolean(user?.id))
  const send = useSendChatMessage()
  useAutoMarkChatRead(CHAT_GRUPO_THREAD_ID, Boolean(user?.id) && !modalOpen)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = () => {
    const limpo = texto.trim()
    if (!limpo || !user || send.isPending) return
    send.mutate(
      { threadId: CHAT_GRUPO_THREAD_ID, texto: limpo },
      {
        onSuccess: () => {
          setTexto('')
          inputRef.current?.focus()
        },
      },
    )
  }

  if (!user) return null

  return (
    <>
      <Box
        sx={{
          flexShrink: fillHeight ? 1 : 0,
          flex: fillHeight ? 1 : undefined,
          borderTop: fillHeight ? 'none' : `1px solid ${theme.palette.divider}`,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: fillHeight ? 'none' : 280,
          minHeight: fillHeight ? 0 : 200,
          height: fillHeight ? '100%' : undefined,
          bgcolor: alpha(theme.palette.background.paper, 0.92),
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 1,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          }}
        >
          <Badge
            color="error"
            badgeContent={unread}
            max={99}
            overlap="circular"
            invisible={unread < 1}
            sx={{
              '& .MuiBadge-badge': {
                fontWeight: 800,
                minWidth: 16,
                height: 16,
                fontSize: '0.6rem',
              },
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(accent, 0.14),
                color: accent,
              }}
            >
              <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 18 }} />
            </Box>
          </Badge>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '0.8rem',
                letterSpacing: '-0.02em',
                color: premiumTokens.primaryDark,
                lineHeight: 1.2,
              }}
            >
              Bate-papo
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Grupo geral
            </Typography>
          </Box>
          <IconButton
            size="small"
            aria-label="Abrir bate-papo completo"
            onClick={() => setModalOpen(true)}
            sx={{ color: 'text.secondary' }}
          >
            <OpenInFullRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            px: 1.25,
            py: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
          }}
        >
          {messages.length === 0 ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ m: 'auto', textAlign: 'center', px: 1 }}
            >
              Nenhuma mensagem ainda. Escreva abaixo.
            </Typography>
          ) : (
            messages.slice(-40).map((m) => {
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
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        color: 'text.secondary',
                        mb: 0.2,
                        ml: 0.5,
                      }}
                    >
                      {m.autorNome}
                    </Typography>
                  ) : null}
                  <Box
                    sx={{
                      px: 1.1,
                      py: 0.7,
                      borderRadius: mine ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      bgcolor: mine ? accent : alpha(theme.palette.text.primary, 0.06),
                      color: mine ? theme.palette.primary.contrastText : 'text.primary',
                      border: mine ? 'none' : `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
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
                        mt: 0.25,
                        textAlign: 'right',
                        opacity: 0.7,
                        fontSize: '0.58rem',
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
            placeholder="Escreva…"
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
              px: 1,
              py: 0.4,
              borderRadius: 999,
              border: `1px solid ${alpha(accent, 0.22)}`,
              bgcolor: alpha(theme.palette.background.default, 0.6),
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
      <ChatModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
