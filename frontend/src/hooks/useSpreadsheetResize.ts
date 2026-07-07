import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const MIN_COL_WIDTH = 48
const MIN_ROW_HEIGHT = 28

type ColumnResizeSession = {
  columnId: string
  startX: number
  startWidth: number
}

type RowResizeSession = {
  rowId: string
  startY: number
  startHeight: number
}

export function buildDefaultColumnWidths(
  columns: ReadonlyArray<{ key: string; width: number }>,
  selectColumnWidth = 48,
): Record<string, number> {
  const widths: Record<string, number> = { select: selectColumnWidth }
  for (const column of columns) {
    widths[column.key] = column.width
  }
  return widths
}

export function useSpreadsheetResize(defaultColumnWidths: Record<string, number>) {
  const [columnWidths, setColumnWidths] = useState(defaultColumnWidths)
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({})
  const columnSession = useRef<ColumnResizeSession | null>(null)
  const rowSession = useRef<RowResizeSession | null>(null)

  useEffect(() => {
    setColumnWidths((prev) => {
      const next = { ...defaultColumnWidths }
      for (const key of Object.keys(prev)) {
        if (key in next) next[key] = prev[key]
      }
      return next
    })
  }, [defaultColumnWidths])

  const startColumnResize = useCallback(
    (columnId: string, startX: number) => {
      columnSession.current = {
        columnId,
        startX,
        startWidth: columnWidths[columnId] ?? MIN_COL_WIDTH,
      }
    },
    [columnWidths],
  )

  const startRowResize = useCallback(
    (rowId: string, startY: number, currentHeight: number) => {
      rowSession.current = {
        rowId,
        startY,
        startHeight: currentHeight,
      }
    },
    [],
  )

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (columnSession.current) {
        const { columnId, startX, startWidth } = columnSession.current
        const delta = event.clientX - startX
        const nextWidth = Math.max(MIN_COL_WIDTH, Math.round(startWidth + delta))
        setColumnWidths((prev) => ({ ...prev, [columnId]: nextWidth }))
      }
      if (rowSession.current) {
        const { rowId, startY, startHeight } = rowSession.current
        const delta = event.clientY - startY
        const nextHeight = Math.max(MIN_ROW_HEIGHT, Math.round(startHeight + delta))
        setRowHeights((prev) => ({ ...prev, [rowId]: nextHeight }))
      }
    }

    const onMouseUp = () => {
      columnSession.current = null
      rowSession.current = null
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const getRowHeight = useCallback(
    (rowId: string) => rowHeights[rowId],
    [rowHeights],
  )

  const tableMinWidth = useMemo(
    () => Object.values(columnWidths).reduce((sum, width) => sum + width, 0),
    [columnWidths],
  )

  return {
    columnWidths,
    getRowHeight,
    startColumnResize,
    startRowResize,
    tableMinWidth,
  }
}
