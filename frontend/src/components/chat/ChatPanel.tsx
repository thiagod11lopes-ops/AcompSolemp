import { useState } from 'react'
import { Badge, IconButton, Tooltip } from '@mui/material'
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded'
import { ChatModal } from '@/components/chat/ChatModal'
import { useChatUnreadCount } from '@/hooks/useChat'

interface ChatPanelProps {
  size?: 'small' | 'medium'
  /** Evita que o clique dispare o NavLink da aba. */
  stopClickPropagation?: boolean
}

export function ChatPanel({ size = 'medium', stopClickPropagation = false }: ChatPanelProps) {
  const [open, setOpen] = useState(false)
  const { data: unread = 0 } = useChatUnreadCount()

  return (
    <>
      <Tooltip title="Bate-papo">
        <IconButton
          color="inherit"
          size={size}
          aria-label="Bate-papo"
          onClick={(e) => {
            if (stopClickPropagation) e.stopPropagation()
            setOpen(true)
          }}
        >
          <Badge color="error" badgeContent={unread} max={99} invisible={!unread}>
            <ChatBubbleOutlineRoundedIcon fontSize={size === 'small' ? 'small' : 'medium'} />
          </Badge>
        </IconButton>
      </Tooltip>
      <ChatModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
