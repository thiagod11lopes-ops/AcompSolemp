import { IconButton, Tooltip } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

interface SidebarRailToggleProps {
  collapsed: boolean
  onToggle: () => void
}

/** Botão para recolher/expandir o menu lateral (desktop). */
export function SidebarRailToggle({ collapsed, onToggle }: SidebarRailToggleProps) {
  return (
    <Tooltip title={collapsed ? 'Expandir menu' : 'Recolher menu'} placement="right">
      <IconButton
        size="small"
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        sx={{
          width: 28,
          height: 28,
          color: 'text.secondary',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
        }}
      >
        {collapsed ? (
          <ChevronRightIcon sx={{ fontSize: 18 }} />
        ) : (
          <ChevronLeftIcon sx={{ fontSize: 18 }} />
        )}
      </IconButton>
    </Tooltip>
  )
}
