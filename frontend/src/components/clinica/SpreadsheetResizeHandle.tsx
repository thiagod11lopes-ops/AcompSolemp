import { Box } from '@mui/material'
import type { MouseEvent as ReactMouseEvent } from 'react'

const resizeHandleBaseSx = {
  position: 'absolute' as const,
  zIndex: 3,
  userSelect: 'none' as const,
  touchAction: 'none' as const,
}

export function ColumnResizeHandle({
  onResizeStart,
}: {
  onResizeStart: (event: ReactMouseEvent) => void
}) {
  return (
    <Box
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onResizeStart(event)
      }}
      sx={{
        ...resizeHandleBaseSx,
        top: 0,
        right: 0,
        bottom: 0,
        width: 8,
        marginRight: '-4px',
        cursor: 'col-resize',
        '&:hover': {
          bgcolor: 'rgba(33, 115, 70, 0.25)',
        },
      }}
    />
  )
}

export function RowResizeHandle({
  onResizeStart,
}: {
  onResizeStart: (event: ReactMouseEvent) => void
}) {
  return (
    <Box
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onResizeStart(event)
      }}
      sx={{
        ...resizeHandleBaseSx,
        left: 0,
        right: 0,
        bottom: 0,
        height: 8,
        marginBottom: '-4px',
        cursor: 'row-resize',
        '&:hover': {
          bgcolor: 'rgba(33, 115, 70, 0.2)',
        },
      }}
    />
  )
}

export function getColumnCellSx(width: number) {
  return {
    width,
    minWidth: width,
    whiteSpace: 'nowrap' as const,
    position: 'relative' as const,
    overflow: 'visible',
  }
}
