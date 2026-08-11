import { Box, Paper, Typography } from '@mui/material'
import { memo, useCallback, useMemo, useState } from 'react'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  PLANILHA_BRANCA_CELL_WIDTH,
  PLANILHA_BRANCA_ROW_HEADER_WIDTH,
  PLANILHA_BRANCA_ROW_HEIGHT,
  colIndexToLetter,
  normalizeSpreadsheetGrid,
} from '@/utils/planilhaBrancaGrid'

interface PlanilhaBrancaSpreadsheetProps {
  nome: string
  grid: string[][]
  onGridChange: (grid: string[][]) => void
}

function PlanilhaBrancaSpreadsheetInner({
  nome,
  grid,
  onGridChange,
}: PlanilhaBrancaSpreadsheetProps) {
  const cells = useMemo(() => normalizeSpreadsheetGrid(grid), [grid])
  const rowCount = cells.length
  const colCount = cells[0]?.length ?? 0
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null)
  const [draft, setDraft] = useState('')

  const commitCell = useCallback(() => {
    if (!editing) return
    const { row, col } = editing
    const next = cells.map((r, ri) =>
      r.map((value, ci) => (ri === row && ci === col ? draft : value)),
    )
    onGridChange(next)
    setEditing(null)
    setDraft('')
  }, [editing, draft, cells, onGridChange])

  const startEdit = (row: number, col: number) => {
    setEditing({ row, col })
    setDraft(cells[row]?.[col] ?? '')
  }

  const colLetters = useMemo(
    () => Array.from({ length: colCount }, (_, i) => colIndexToLetter(i)),
    [colCount],
  )

  return (
    <Paper
      elevation={0}
      className="excel-sheet"
      sx={{
        border: EXCEL_SHEET.border,
        borderRadius: 0,
        overflow: 'hidden',
        bgcolor: EXCEL_SHEET.sheetBg,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1,
          bgcolor: EXCEL_SHEET.toolbarBg,
          borderBottom: EXCEL_SHEET.border,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: EXCEL_SHEET.text }}>
          {nome}
        </Typography>
        <Typography sx={{ fontSize: '11px', color: EXCEL_SHEET.mutedText }}>
          Planilha
        </Typography>
      </Box>

      <Box sx={{ overflow: 'auto', maxHeight: 'min(70vh, 720px)' }}>
        <Box
          component="table"
          sx={{
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            minWidth:
              PLANILHA_BRANCA_ROW_HEADER_WIDTH + colCount * PLANILHA_BRANCA_CELL_WIDTH,
          }}
        >
          <thead>
            <tr>
              <Box
                component="th"
                sx={{
                  position: 'sticky',
                  top: 0,
                  left: 0,
                  zIndex: 3,
                  width: PLANILHA_BRANCA_ROW_HEADER_WIDTH,
                  minWidth: PLANILHA_BRANCA_ROW_HEADER_WIDTH,
                  height: PLANILHA_BRANCA_ROW_HEIGHT,
                  bgcolor: EXCEL_SHEET.headerBg,
                  border: EXCEL_SHEET.border,
                  borderColor: EXCEL_SHEET.borderColor,
                }}
              />
              {colLetters.map((letter) => (
                <Box
                  component="th"
                  key={letter}
                  sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    width: PLANILHA_BRANCA_CELL_WIDTH,
                    minWidth: PLANILHA_BRANCA_CELL_WIDTH,
                    height: PLANILHA_BRANCA_ROW_HEIGHT,
                    bgcolor: EXCEL_SHEET.headerBg,
                    border: EXCEL_SHEET.border,
                    borderColor: EXCEL_SHEET.borderColor,
                    fontFamily: EXCEL_SHEET.fontFamily,
                    fontSize: '11px',
                    fontWeight: 600,
                    color: EXCEL_SHEET.mutedText,
                    textAlign: 'center',
                    userSelect: 'none',
                  }}
                >
                  {letter}
                </Box>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, rowIndex) => (
              <tr key={rowIndex}>
                <Box
                  component="th"
                  sx={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    width: PLANILHA_BRANCA_ROW_HEADER_WIDTH,
                    minWidth: PLANILHA_BRANCA_ROW_HEADER_WIDTH,
                    height: PLANILHA_BRANCA_ROW_HEIGHT,
                    bgcolor: EXCEL_SHEET.headerBg,
                    border: EXCEL_SHEET.border,
                    borderColor: EXCEL_SHEET.borderColor,
                    fontFamily: EXCEL_SHEET.fontFamily,
                    fontSize: '11px',
                    fontWeight: 600,
                    color: EXCEL_SHEET.mutedText,
                    textAlign: 'center',
                    userSelect: 'none',
                  }}
                >
                  {rowIndex + 1}
                </Box>
                {Array.from({ length: colCount }, (_, colIndex) => {
                  const value = cells[rowIndex]?.[colIndex] ?? ''
                  const isEditing =
                    editing?.row === rowIndex && editing?.col === colIndex
                  return (
                    <Box
                      component="td"
                      key={colIndex}
                      onClick={() => startEdit(rowIndex, colIndex)}
                      sx={{
                        width: PLANILHA_BRANCA_CELL_WIDTH,
                        minWidth: PLANILHA_BRANCA_CELL_WIDTH,
                        height: PLANILHA_BRANCA_ROW_HEIGHT,
                        p: 0,
                        border: EXCEL_SHEET.border,
                        borderColor: EXCEL_SHEET.borderColor,
                        bgcolor: EXCEL_SHEET.cellBg,
                        cursor: 'cell',
                        '&:hover': { bgcolor: EXCEL_SHEET.hoverBg },
                      }}
                    >
                      {isEditing ? (
                        <Box
                          component="input"
                          autoFocus
                          value={draft}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setDraft(e.target.value)
                          }
                          onBlur={commitCell}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              commitCell()
                            }
                            if (e.key === 'Escape') {
                              setEditing(null)
                              setDraft('')
                            }
                          }}
                          sx={{
                            width: '100%',
                            height: '100%',
                            border: '2px solid #217346',
                            outline: 'none',
                            px: 0.5,
                            boxSizing: 'border-box',
                            fontFamily: EXCEL_SHEET.fontFamily,
                            fontSize: EXCEL_SHEET.fontSize,
                            color: EXCEL_SHEET.text,
                            bgcolor: '#fff',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            px: 0.5,
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            fontFamily: EXCEL_SHEET.fontFamily,
                            fontSize: EXCEL_SHEET.fontSize,
                            color: EXCEL_SHEET.text,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {value}
                        </Box>
                      )}
                    </Box>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </Paper>
  )
}

export const PlanilhaBrancaSpreadsheet = memo(PlanilhaBrancaSpreadsheetInner)
