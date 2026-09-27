import type { RefObject } from 'react'
import {
  alpha,
  Box,
  IconButton,
  InputBase,
  Typography,
  useTheme,
} from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import type { ChatMessage, User } from '@/types'
import { CHAT_DELETED_PLACEHOLDER } from '@/services/chatService'

export type ChatComposerMode =
  | { type: 'send' }
  | { type: 'edit'; message: ChatMessage }
  | { type: 'reply'; message: ChatMessage }

interface ChatComposerProps {
  mode: ChatComposerMode
  texto: string
  onTextoChange: (value: string) => void
  onSubmit: () => void
  onCancelMode: () => void
  inputRef: RefObject<HTMLInputElement | null>
  user: User
  isGrupo: boolean
  pending?: boolean
  compact?: boolean
}

export function ChatComposer({
  mode,
  texto,
  onTextoChange,
  onSubmit,
  onCancelMode,
  inputRef,
  user,
  isGrupo,
  pending = false,
  compact = false,
}: ChatComposerProps) {
  const theme = useTheme()
  const accent = theme.palette.primary.main
  const editing = mode.type === 'edit'
  const replying = mode.type === 'reply'
  const contextMsg = editing || replying ? mode.message : null

  const placeholder = editing
    ? 'Editar mensagem…'
    : isGrupo
      ? 'Mensagem para o grupo…'
      : 'Mensagem particular…'

  return (
    <Box
      sx={{
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.background.paper, compact ? 1 : 0.85),
        backdropFilter: compact ? undefined : 'blur(10px)',
      }}
    >
      {contextMsg ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: compact ? 1.1 : 1.5,
            pt: 1,
            pb: 0.25,
          }}
        >
          <Box
            sx={{
              color: accent,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {editing ? (
              <EditRoundedIcon sx={{ fontSize: compact ? 16 : 18 }} />
            ) : (
              <ReplyRoundedIcon sx={{ fontSize: compact ? 16 : 18 }} />
            )}
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              borderLeft: `3px solid ${accent}`,
              pl: 1,
            }}
          >
            <Typography
              sx={{
                fontSize: compact ? '0.69rem' : '0.78rem',
                fontWeight: 800,
                color: accent,
                lineHeight: 1.2,
              }}
            >
              {editing
                ? 'Editando mensagem'
                : `Respondendo a ${
                    contextMsg.autorId === user.id ? 'você' : contextMsg.autorNome
                  }`}
            </Typography>
            <Typography
              noWrap
              sx={{
                fontSize: compact ? '0.69rem' : '0.78rem',
                color: 'text.secondary',
                fontStyle: contextMsg.apagadaParaTodos ? 'italic' : 'normal',
              }}
            >
              {contextMsg.apagadaParaTodos
                ? CHAT_DELETED_PLACEHOLDER
                : contextMsg.texto}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onCancelMode} aria-label="Cancelar">
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      ) : null}

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 0.5 : 1,
          px: compact ? 1 : 1.5,
          py: compact ? 0.85 : 1.5,
        }}
      >
        <InputBase
          inputRef={inputRef}
          fullWidth
          placeholder={placeholder}
          value={texto}
          onChange={(e) => onTextoChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && mode.type !== 'send') {
              e.preventDefault()
              onCancelMode()
              return
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSubmit()
            }
          }}
          sx={{
            fontSize: compact ? '0.92rem' : '1.04rem',
            px: compact ? 1.1 : 1.25,
            py: compact ? 0.45 : 0.6,
            borderRadius: 999,
            border: `1px solid ${alpha(accent, 0.22)}`,
            bgcolor: alpha(theme.palette.background.default, 0.55),
          }}
        />
        <IconButton
          type="submit"
          size="small"
          disabled={!texto.trim() || pending}
          sx={{
            bgcolor: accent,
            color: theme.palette.primary.contrastText,
            width: compact ? 32 : 40,
            height: compact ? 32 : 40,
            '&:hover': { bgcolor: theme.palette.primary.dark },
            '&.Mui-disabled': { bgcolor: alpha(accent, 0.3), color: '#fff' },
          }}
        >
          <SendRoundedIcon sx={{ fontSize: compact ? 16 : 20 }} />
        </IconButton>
      </Box>
    </Box>
  )
}
