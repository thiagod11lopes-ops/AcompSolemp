import { memo, useCallback, useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'

const COMMIT_DEBOUNCE_MS = 150

function toSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

interface SpreadsheetEditableCellProps {
  rowId: string
  field: string
  value: string
  onCellChange: (rowId: string, field: string, value: string) => void
  onDraftChange?: (rowId: string, field: string, draft: string | null) => void
  onContextMenu: (event: MouseEvent, rowId: string) => void
}

export const SpreadsheetEditableCell = memo(function SpreadsheetEditableCell({
  rowId,
  field,
  value,
  onCellChange,
  onDraftChange,
  onContextMenu,
}: SpreadsheetEditableCellProps) {
  const singleLineValue = toSingleLine(value)
  const [localValue, setLocalValue] = useState(singleLineValue)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValueRef = useRef(singleLineValue)

  useEffect(() => {
    const next = toSingleLine(value)
    latestValueRef.current = next
    setLocalValue(next)
  }, [value])

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  const commit = useCallback(
    (next: string) => {
      const normalized = toSingleLine(next)
      if (normalized !== latestValueRef.current) {
        onCellChange(rowId, field, normalized)
      }
    },
    [onCellChange, rowId, field],
  )

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = toSingleLine(event.target.value)
    setLocalValue(next)
    onDraftChange?.(rowId, field, next)
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
    onDraftChange?.(rowId, field, null)
  }

  const isNumber =
    field === 'valor' || field === 'valorUnitario' || field === 'precoReferencia'

  return (
    <input
      type="text"
      className={`excel-editable-input${isNumber ? ' excel-cell-number' : ''}`}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onContextMenu={(event) => onContextMenu(event, rowId)}
      aria-label={field}
    />
  )
})
