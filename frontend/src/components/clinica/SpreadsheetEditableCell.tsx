import { Box } from '@mui/material'
import { memo, useCallback, useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import type { ConsumoMaterialColunaKey } from '@/utils/consumoMaterialTemplate'

const MAX_CELL_LINES = 3
const MAX_CHARS_PER_LINE = 30
const COMMIT_DEBOUNCE_MS = 150

function clampLinhasCelula(value: string, maxLines: number): string {
  const lines = value.split('\n')
  if (lines.length <= maxLines) return value
  return lines.slice(0, maxLines).join('\n')
}

const textareaSx = {
  width: '100%',
  maxWidth: `${MAX_CHARS_PER_LINE}ch`,
  minHeight: 28,
  fontSize: '0.78rem',
  lineHeight: 1.4,
  whiteSpace: 'pre-wrap' as const,
  overflowWrap: 'anywhere' as const,
  wordBreak: 'break-word' as const,
  overflow: 'hidden',
  resize: 'none' as const,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  px: 0.75,
  py: 0.5,
  margin: 0,
  display: 'block',
  boxSizing: 'border-box' as const,
}

interface SpreadsheetEditableCellProps {
  rowId: string
  field: ConsumoMaterialColunaKey
  value: string
  onCellChange: (rowId: string, field: ConsumoMaterialColunaKey, value: string) => void
  onContextMenu: (event: MouseEvent, rowId: string) => void
}

export const SpreadsheetEditableCell = memo(function SpreadsheetEditableCell({
  rowId,
  field,
  value,
  onCellChange,
  onContextMenu,
}: SpreadsheetEditableCellProps) {
  const [localValue, setLocalValue] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValueRef = useRef(value)

  useEffect(() => {
    latestValueRef.current = value
    setLocalValue(value)
  }, [value])

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  const commit = useCallback(
    (next: string) => {
      const clamped = clampLinhasCelula(next, MAX_CELL_LINES)
      if (clamped !== latestValueRef.current) {
        onCellChange(rowId, field, clamped)
      }
    },
    [onCellChange, rowId, field],
  )

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = clampLinhasCelula(event.target.value, MAX_CELL_LINES)
    setLocalValue(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      commit(next)
    }, COMMIT_DEBOUNCE_MS)
  }

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    commit(localValue)
  }

  return (
    <Box
      component="textarea"
      value={localValue}
      rows={1}
      onChange={handleChange}
      onBlur={handleBlur}
      onContextMenu={(event) => onContextMenu(event, rowId)}
      aria-label={field}
      sx={{
        ...textareaSx,
        fontFamily:
          field === 'valor' ? '"JetBrains Mono", "Roboto Mono", monospace' : 'inherit',
      }}
    />
  )
})
