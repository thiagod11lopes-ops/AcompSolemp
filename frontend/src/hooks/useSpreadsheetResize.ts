import { useCallback, useEffect, useRef, useState } from 'react'

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

export function useSpreadsheetResize() {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({})
  const columnSession = useRef<ColumnResizeSession | null>(null)
  const rowSession = useRef<RowResizeSession | null>(null)
  const rafId = useRef<number | null>(null)
  const pendingColumn = useRef<{ columnId: string; width: number } | null>(null)
  const pendingRow = useRef<{ rowId: string; height: number } | null>(null)

  const startColumnResize = useCallback(
    (columnId: string, startX: number, currentWidth?: number) => {
      columnSession.current = {
        columnId,
        startX,
        startWidth: currentWidth ?? columnWidths[columnId] ?? MIN_COL_WIDTH,
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
    const flushPending = () => {
      rafId.current = null
      if (pendingColumn.current) {
        const { columnId, width } = pendingColumn.current
        pendingColumn.current = null
        setColumnWidths((prev) => ({ ...prev, [columnId]: width }))
      }
      if (pendingRow.current) {
        const { rowId, height } = pendingRow.current
        pendingRow.current = null
        setRowHeights((prev) => ({ ...prev, [rowId]: height }))
      }
    }

    const scheduleFlush = () => {
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(flushPending)
      }
    }

    const onMouseMove = (event: MouseEvent) => {
      if (columnSession.current) {
        const { columnId, startX, startWidth } = columnSession.current
        const delta = event.clientX - startX
        const nextWidth = Math.max(MIN_COL_WIDTH, Math.round(startWidth + delta))
        pendingColumn.current = { columnId, width: nextWidth }
        scheduleFlush()
      }
      if (rowSession.current) {
        const { rowId, startY, startHeight } = rowSession.current
        const delta = event.clientY - startY
        const nextHeight = Math.max(MIN_ROW_HEIGHT, Math.round(startHeight + delta))
        pendingRow.current = { rowId, height: nextHeight }
        scheduleFlush()
      }
    }

    const onMouseUp = () => {
      columnSession.current = null
      rowSession.current = null
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
      if (pendingColumn.current || pendingRow.current) {
        flushPending()
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    }
  }, [])

  const getRowHeight = useCallback(
    (rowId: string) => rowHeights[rowId],
    [rowHeights],
  )

  return {
    columnWidths,
    getRowHeight,
    startColumnResize,
    startRowResize,
  }
}
