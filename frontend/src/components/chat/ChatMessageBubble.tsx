import { useMemo, useRef, useState } from 'react'
import {
  alpha,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  useTheme,
} from '@mui/material'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded'
import type { ChatMessage, User } from '@/types'
import {
  canEditOrDeleteForEveryone,
  CHAT_DELETED_PLACEHOLDER,
} from '@/services/chatService'
import {
  useDeleteChatMessageForEveryone,
  useDeleteChatMessageForMe,
} from '@/hooks/useChat'
import { formatRelative } from '@/utils/format'
import { getRoleLabel } from '@/mocks/seed'

export interface ChatMessageBubbleProps {
  message: ChatMessage
  allMessages: ChatMessage[]
  user: User
  isGrupo: boolean
  compact?: boolean
  onEdit: (message: ChatMessage) => void
  onReply: (message: ChatMessage) => void
}

export function ChatMessageBubble({
  message: m,
  allMessages,
  user,
  isGrupo,
  compact = false,
  onEdit,
  onReply,
}: ChatMessageBubbleProps) {
  const theme = useTheme()
  const accent = theme.palette.primary.main
  const mine = m.autorId === user.id
  const deleted = Boolean(m.apagadaParaTodos)
  const canMutate = canEditOrDeleteForEveryone(m, user.id)
  const deleteMe = useDeleteChatMessageForMe()
  const deleteAll = useDeleteChatMessageForEveryone()

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [confirmEveryone, setConfirmEveryone] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const quoted = useMemo(() => {
    if (!m.respostaAId || deleted) return null
    return allMessages.find((x) => x.id === m.respostaAId) ?? null
  }, [allMessages, m.respostaAId, deleted])

  const closeMenu = () => {
    setAnchorEl(null)
    setMenuPos(null)
  }

  const openAt = (el: HTMLElement | null, pos?: { top: number; left: number }) => {
    if (pos) {
      setMenuPos(pos)
      setAnchorEl(null)
    } else {
      setAnchorEl(el)
      setMenuPos(null)
    }
  }

  const handleCopy = async () => {
    closeMenu()
    if (deleted) return
    try {
      await navigator.clipboard.writeText(m.texto)
    } catch {
      // Clipboard pode falhar em contextos sem permissão.
    }
  }

  const handleDeleteMe = () => {
    closeMenu()
    deleteMe.mutate({ messageId: m.id, threadId: m.threadId })
  }

  const handleDeleteEveryone = () => {
    closeMenu()
    setConfirmEveryone(true)
  }

  const confirmDeleteEveryone = () => {
    deleteAll.mutate(
      { messageId: m.id },
      { onSettled: () => setConfirmEveryone(false) },
    )
  }

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const fsBody = compact ? '0.85rem' : '1.01rem'
  const fsMeta = compact ? '0.64rem' : '0.75rem'
  const fsAuthor = compact ? '0.69rem' : '0.86rem'
  const fsQuote = compact ? '0.72rem' : '0.82rem'
  const menuOpen = Boolean(anchorEl) || menuPos != null

  return (
    <>
      <Box
        sx={{
          alignSelf: mine ? 'flex-end' : 'flex-start',
          maxWidth: compact ? '92%' : '78%',
          position: 'relative',
          '&:hover .chat-msg-more': { opacity: 1 },
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          openAt(null, { top: e.clientY, left: e.clientX })
        }}
        onTouchStart={(e) => {
          const t = e.touches[0]
          clearLongPress()
          longPressTimer.current = setTimeout(() => {
            openAt(null, { top: t.clientY, left: t.clientX })
          }, 450)
        }}
        onTouchEnd={clearLongPress}
        onTouchMove={clearLongPress}
      >
        {!mine && !deleted ? (
          <Typography
            sx={{
              fontSize: fsAuthor,
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

        <Box sx={{ position: 'relative' }}>
          <IconButton
            className="chat-msg-more"
            size="small"
            aria-label="Opções da mensagem"
            onClick={(e) => {
              e.stopPropagation()
              openAt(e.currentTarget)
            }}
            sx={{
              position: 'absolute',
              top: 2,
              ...(mine ? { left: -28 } : { right: -28 }),
              opacity: { xs: 0.55, md: 0 },
              transition: 'opacity 120ms ease',
              color: 'text.secondary',
              p: 0.25,
            }}
          >
            <MoreVertRoundedIcon sx={{ fontSize: compact ? 16 : 18 }} />
          </IconButton>

          <Box
            sx={{
              px: compact ? 1.1 : 1.5,
              py: compact ? 0.65 : 1.05,
              borderRadius: mine ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              bgcolor: mine
                ? deleted
                  ? alpha(accent, 0.55)
                  : accent
                : alpha(theme.palette.text.primary, 0.06),
              color: mine ? theme.palette.primary.contrastText : 'text.primary',
              border: mine ? 'none' : `1px solid ${theme.palette.divider}`,
              fontStyle: deleted ? 'italic' : 'normal',
              opacity: deleted ? 0.92 : 1,
            }}
          >
            {quoted ? (
              <Box
                sx={{
                  mb: 0.6,
                  px: 0.85,
                  py: 0.45,
                  borderRadius: 1,
                  borderLeft: `3px solid ${mine ? alpha('#fff', 0.85) : accent}`,
                  bgcolor: mine
                    ? alpha('#000', 0.12)
                    : alpha(theme.palette.text.primary, 0.05),
                }}
              >
                <Typography
                  sx={{
                    fontSize: fsQuote,
                    fontWeight: 800,
                    opacity: 0.9,
                    lineHeight: 1.2,
                  }}
                >
                  {quoted.autorId === user.id ? 'Você' : quoted.autorNome}
                </Typography>
                <Typography
                  noWrap
                  sx={{
                    fontSize: fsQuote,
                    opacity: 0.8,
                    fontStyle: quoted.apagadaParaTodos ? 'italic' : 'normal',
                  }}
                >
                  {quoted.apagadaParaTodos ? CHAT_DELETED_PLACEHOLDER : quoted.texto}
                </Typography>
              </Box>
            ) : null}

            <Typography
              sx={{
                fontSize: fsBody,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.35,
              }}
            >
              {deleted ? CHAT_DELETED_PLACEHOLDER : m.texto}
            </Typography>
            <Typography
              sx={{
                display: 'block',
                mt: 0.2,
                textAlign: 'right',
                opacity: 0.7,
                fontSize: fsMeta,
              }}
            >
              {!deleted && m.editadoEm ? 'editada · ' : ''}
              {formatRelative(m.data)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Menu
        open={menuOpen}
        onClose={closeMenu}
        anchorEl={anchorEl}
        anchorReference={menuPos ? 'anchorPosition' : 'anchorEl'}
        anchorPosition={menuPos ?? undefined}
        slotProps={{
          paper: {
            sx: { minWidth: 220, borderRadius: 2 },
          },
        }}
      >
        {!deleted ? (
          <MenuItem
            onClick={() => {
              closeMenu()
              onReply(m)
            }}
          >
            <ListItemIcon>
              <ReplyRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Responder</ListItemText>
          </MenuItem>
        ) : null}
        {!deleted ? (
          <MenuItem onClick={handleCopy}>
            <ListItemIcon>
              <ContentCopyRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Copiar</ListItemText>
          </MenuItem>
        ) : null}
        {mine && canMutate ? (
          <MenuItem
            onClick={() => {
              closeMenu()
              onEdit(m)
            }}
          >
            <ListItemIcon>
              <EditRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        ) : null}
        <MenuItem onClick={handleDeleteMe}>
          <ListItemIcon>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Apagar para mim</ListItemText>
        </MenuItem>
        {mine && canMutate ? (
          <MenuItem onClick={handleDeleteEveryone}>
            <ListItemIcon>
              <DeleteForeverRoundedIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>Apagar para todos</ListItemText>
          </MenuItem>
        ) : null}
      </Menu>

      <Dialog open={confirmEveryone} onClose={() => setConfirmEveryone(false)}>
        <DialogTitle>Apagar para todos?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            A mensagem será apagada para todos os participantes desta conversa.
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEveryone(false)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disableElevation
            onClick={confirmDeleteEveryone}
            disabled={deleteAll.isPending}
          >
            Apagar para todos
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
