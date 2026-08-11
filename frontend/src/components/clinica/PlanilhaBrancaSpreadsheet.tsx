import { Box, Paper, Typography } from '@mui/material'
import { memo, useCallback, useMemo, useState } from 'react'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  PLANILHA_BRANCA_CELL_WIDTH,
  PLANILHA_BRANCA_ROW_HEADER_WIDTH,
  PLANILHA_BRANCA_ROW_HEIGHT,
  colIndexToLetter,
  isCellCoveredByMerge,
  isMergeOrigin,
  normalizeSheetData,
  type PlanilhaCellStyle,
  type PlanilhaSheetData,
} from '@/utils/planilhaBrancaGrid'

interface PlanilhaBrancaSpreadsheetProps {
  nome: string
  sheet: PlanilhaSheetData
  onSheetChange: (sheet: PlanilhaSheetData) => void
}

function cellSx(style?: PlanilhaCellStyle) {
  return {
    fontFamily: style?.fontFamily || EXCEL_SHEET.fontFamily,
    fontSize: style?.fontSize ? `${style.fontSize}pt` : EXCEL_SHEET.fontSize,
    fontWeight: style?.bold ? 700 : 400,
    fontStyle: style?.italic ? 'italic' : 'normal',
    textDecoration: style?.underline ? 'underline' : 'none',
    color: style?.color || EXCEL_SHEET.text,
    bgcolor: style?.backgroundColor || EXCEL_SHEET.cellBg,
    textAlign: style?.horizontalAlign || 'left',
    verticalAlign:
      style?.verticalAlign === 'top'
        ? 'top'
        : style?.verticalAlign === 'bottom'
          ? 'bottom'
          : 'middle',
    whiteSpace: style?.wrapText ? 'pre-wrap' : 'pre',
    wordBreak: style?.wrapText ? 'break-word' : 'normal',
    borderTop: style?.borderTop ? `1px solid ${style.borderTop}` : EXCEL_SHEET.border,
    borderRight: style?.borderRight ? `1px solid ${style.borderRight}` : EXCEL_SHEET.border,
    borderBottom: style?.borderBottom ? `1px solid ${style.borderBottom}` : EXCEL_SHEET.border,
    borderLeft: style?.borderLeft ? `1px solid ${style.borderLeft}` : EXCEL_SHEET.border,
  } as const
}

function PlanilhaBrancaSpreadsheetInner({
  nome,
  sheet,
  onSheetChange,
}: PlanilhaBrancaSpreadsheetProps) {
  const data = useMemo(() => normalizeSheetData(sheet), [sheet])
  const rowCount = data.cells.length
  const colCount = data.cells[0]?.length ?? 0
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null)
  const [draft, setDraft] = useState('')

  const commitCell = useCallback(() => {
    if (!editing) return
    const { row, col } = editing
    const nextCells = data.cells.map((r, ri) =>
      r.map((cell, ci) =>
        ri === row && ci === col ? { ...cell, value: draft } : cell,
      ),
    )
    onSheetChange({ ...data, cells: nextCells })
    setEditing(null)
    setDraft('')
  }, [editing, draft, data, onSheetChange])

  const startEdit = (row: number, col: number) => {
    setEditing({ row, col })
    setDraft(data.cells[row]?.[col]?.value ?? '')
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
          Planilha (estilos preservados)
        </Typography>
      </Box>

      <Box sx={{ overflow: 'auto', maxHeight: 'min(75vh, 820px)' }}>
        <Box
          component="table"
          sx={{
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            minWidth:
              PLANILHA_BRANCA_ROW_HEADER_WIDTH +
              (data.colWidths?.reduce((s, w) => s + (w || PLANILHA_BRANCA_CELL_WIDTH), 0) ??
                colCount * PLANILHA_BRANCA_CELL_WIDTH),
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
              {colLetters.map((letter, colIndex) => (
                <Box
                  component="th"
                  key={letter}
                  sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    width: data.colWidths?.[colIndex] ?? PLANILHA_BRANCA_CELL_WIDTH,
                    minWidth: data.colWidths?.[colIndex] ?? PLANILHA_BRANCA_CELL_WIDTH,
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
                    height: data.rowHeights?.[rowIndex] ?? PLANILHA_BRANCA_ROW_HEIGHT,
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
                  const merge = isCellCoveredByMerge(rowIndex, colIndex, data.merges)
                  if (merge && !isMergeOrigin(rowIndex, colIndex, merge)) {
                    return null
                  }
                  const cell = data.cells[rowIndex]?.[colIndex]
                  const style = cell?.style
                  const isEditing =
                    editing?.row === rowIndex && editing?.col === colIndex
                  const colSpan = merge ? merge.endCol - merge.startCol + 1 : 1
                  const rowSpan = merge ? merge.endRow - merge.startRow + 1 : 1
                  const width =
                    colSpan > 1
                      ? Array.from({ length: colSpan }, (_, i) =>
                          data.colWidths?.[colIndex + i] ?? PLANILHA_BRANCA_CELL_WIDTH,
                        ).reduce((a, b) => a + b, 0)
                      : (data.colWidths?.[colIndex] ?? PLANILHA_BRANCA_CELL_WIDTH)
                  const height =
                    rowSpan > 1
                      ? Array.from({ length: rowSpan }, (_, i) =>
                          data.rowHeights?.[rowIndex + i] ?? PLANILHA_BRANCA_ROW_HEIGHT,
                        ).reduce((a, b) => a + b, 0)
                      : (data.rowHeights?.[rowIndex] ?? PLANILHA_BRANCA_ROW_HEIGHT)

                  return (
                    <Box
                      component="td"
                      key={colIndex}
                      colSpan={colSpan}
                      rowSpan={rowSpan}
                      onClick={() => startEdit(rowIndex, colIndex)}
                      sx={{
                        width,
                        minWidth: width,
                        height,
                        minHeight: height,
                        p: 0,
                        cursor: 'cell',
                        ...cellSx(style),
                        '&:hover': {
                          outline: '1px solid #217346',
                          outlineOffset: -1,
                        },
                      }}
                    >
                      {isEditing ? (
                        <Box
                          component="textarea"
                          autoFocus
                          value={draft}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setDraft(e.target.value)
                          }
                          onBlur={commitCell}
                          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
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
                            py: 0.25,
                            boxSizing: 'border-box',
                            resize: 'none',
                            fontFamily: style?.fontFamily || EXCEL_SHEET.fontFamily,
                            fontSize: style?.fontSize
                              ? `${style.fontSize}pt`
                              : EXCEL_SHEET.fontSize,
                            fontWeight: style?.bold ? 700 : 400,
                            fontStyle: style?.italic ? 'italic' : 'normal',
                            color: style?.color || EXCEL_SHEET.text,
                            bgcolor: '#fff',
                            whiteSpace: 'pre-wrap',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            px: 0.5,
                            py: 0.25,
                            height: '100%',
                            width: '100%',
                            boxSizing: 'border-box',
                            display: 'flex',
                            alignItems:
                              style?.verticalAlign === 'top'
                                ? 'flex-start'
                                : style?.verticalAlign === 'bottom'
                                  ? 'flex-end'
                                  : 'center',
                            justifyContent:
                              style?.horizontalAlign === 'center'
                                ? 'center'
                                : style?.horizontalAlign === 'right'
                                  ? 'flex-end'
                                  : 'flex-start',
                            overflow: 'hidden',
                          }}
                        >
                          {cell?.value}
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
