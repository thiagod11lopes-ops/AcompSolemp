import { useMemo } from 'react'
import {
  DeleteOutlined as DeleteIcon,
  EditOutlined as EditIcon,
  Send as SendIcon,
  UploadFileOutlined as UploadFileIcon,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import type { ImhMedicamentoFormData, ImhMedicamentoLinha } from '@/types'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  IMH_MEDICAMENTO_COLUNAS,
  IMH_MEDICAMENTO_WRAP_KEYS,
  calcImhMedicamentoTotalGeral,
  imhMedicamentoHasPreviewContent,
  linhaImhMedicamentoHasContent,
} from '@/utils/imhMedicamentoForm'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'
import '@/components/clinica/spreadsheet-excel.css'

interface ImhMedicamentoPlanilhaPreviewProps {
  value: ImhMedicamentoFormData
  editingLinhaId?: string | null
  importing?: boolean
  isEnviando?: boolean
  mesReferencia?: string
  emptyHint?: string
  selectedImhIds?: Set<string>
  onSelectedImhIdsChange?: (next: Set<string>) => void
  onImportClick?: () => void
  onEnviarImh?: () => void
  onEditLinha?: (linhaId: string) => void
  onDeleteLinha?: (linhaId: string) => void
  /** Visualização sem checklist, envio, importação ou ações. */
  readOnly?: boolean
}

function dash(value: string): string {
  const trimmed = value.trim()
  return trimmed || '—'
}

const cellSx = {
  border: EXCEL_SHEET.border,
  fontFamily: EXCEL_SHEET.fontFamily,
  fontSize: EXCEL_SHEET.fontSize,
  py: 0.75,
  px: 1,
  color: EXCEL_SHEET.text,
  bgcolor: EXCEL_SHEET.cellBg,
  verticalAlign: 'middle' as const,
  whiteSpace: 'nowrap' as const,
} as const

const headerSx = {
  ...cellSx,
  bgcolor: EXCEL_SHEET.headerBg,
  fontWeight: 700,
  color: EXCEL_SHEET.mutedText,
} as const

const finalizedCheckboxSx = {
  color: EXCEL_SHEET.finalizedCheck,
  '&.Mui-checked': { color: EXCEL_SHEET.finalizedCheck },
  '&.Mui-disabled': { color: EXCEL_SHEET.finalizedCheck },
} as const

const selectedCheckboxSx = {
  color: EXCEL_SHEET.selectedCheck,
  '&.Mui-checked': { color: EXCEL_SHEET.selectedCheck },
} as const

export function ImhMedicamentoPlanilhaPreview({
  value,
  editingLinhaId = null,
  importing = false,
  isEnviando = false,
  mesReferencia,
  emptyHint,
  selectedImhIds,
  onSelectedImhIdsChange,
  onImportClick,
  onEnviarImh,
  onEditLinha,
  onDeleteLinha,
  readOnly = false,
}: ImhMedicamentoPlanilhaPreviewProps) {
  const visible = imhMedicamentoHasPreviewContent(value)
  const total = calcImhMedicamentoTotalGeral(value)
  const finalizedIds = useMemo(
    () => new Set(value.finalizedImhIds ?? []),
    [value.finalizedImhIds],
  )
  const selection = selectedImhIds ?? new Set<string>()
  const colCount = IMH_MEDICAMENTO_COLUNAS.length + (readOnly ? 0 : 2)

  const selecionaveis = useMemo(
    () =>
      value.linhas.filter(
        (linha) => linhaImhMedicamentoHasContent(linha) && !finalizedIds.has(linha.id),
      ),
    [value.linhas, finalizedIds],
  )

  const selectedCount = useMemo(
    () => selecionaveis.filter((linha) => selection.has(linha.id)).length,
    [selecionaveis, selection],
  )

  const allSelected =
    selecionaveis.length > 0 && selecionaveis.every((linha) => selection.has(linha.id))
  const someSelected = selecionaveis.some((linha) => selection.has(linha.id))

  const toggleRow = (linha: ImhMedicamentoLinha, checked: boolean) => {
    if (!onSelectedImhIdsChange || finalizedIds.has(linha.id)) return
    const next = new Set(selection)
    if (checked) next.add(linha.id)
    else next.delete(linha.id)
    onSelectedImhIdsChange(next)
  }

  const toggleAll = (checked: boolean) => {
    if (!onSelectedImhIdsChange) return
    const next = new Set(selection)
    for (const linha of selecionaveis) {
      if (checked) next.add(linha.id)
      else next.delete(linha.id)
    }
    for (const id of finalizedIds) next.delete(id)
    onSelectedImhIdsChange(next)
  }

  return (
    <Box
      sx={{
        opacity: visible ? 1 : 0.92,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 280ms ease, transform 280ms ease',
      }}
    >
      <Paper
        elevation={0}
        className="excel-sheet"
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          border: `1px solid ${EXCEL_SHEET.toolbarBorder}`,
          boxShadow: visible
            ? '0 12px 40px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)'
            : 'none',
          bgcolor: EXCEL_SHEET.sheetBg,
        }}
      >
        <Box
          className="excel-sheet-toolbar"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            px: 1.5,
            py: 1,
            background: `linear-gradient(180deg, ${EXCEL_SHEET.toolbarBg} 0%, #ebebeb 100%)`,
          }}
        >
          <Typography
            sx={{
              fontFamily: EXCEL_SHEET.fontFamily,
              fontWeight: 800,
              fontSize: 13,
              color: EXCEL_SHEET.selectedCheck,
            }}
          >
            Modelo IHM — PME
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={`${value.linhas.length} lançamento(s)`}
            sx={{ height: 22, fontWeight: 600 }}
          />
          {mesReferencia ? (
            <Chip
              size="small"
              variant="outlined"
              label={mesReferencia}
              sx={{ height: 22, fontWeight: 600 }}
            />
          ) : null}
          {total > 0 ? (
            <Chip
              size="small"
              variant="outlined"
              label={`Total ${formatValorBrasileiro(total)}`}
              sx={{ height: 22, fontWeight: 600 }}
            />
          ) : null}
          {!readOnly && selectedCount > 0 ? (
            <Chip
              size="small"
              color="primary"
              label={`IMH: ${selectedCount}`}
              sx={{ height: 22, fontWeight: 700 }}
            />
          ) : null}
          {!readOnly && onEnviarImh ? (
            <Button
              size="small"
              variant="contained"
              startIcon={<SendIcon sx={{ fontSize: 16 }} />}
              onClick={onEnviarImh}
              disabled={isEnviando || selectedCount === 0}
              sx={{
                ml: 0.5,
                height: 26,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {isEnviando
                ? 'Enviando para IMH...'
                : selectedCount > 1
                  ? `Enviar para IMH (${selectedCount})`
                  : 'Enviar para IMH'}
            </Button>
          ) : null}
          {!readOnly && onImportClick ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
              onClick={onImportClick}
              disabled={importing || isEnviando}
              sx={{
                ml: 0.5,
                height: 26,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 12,
                borderColor: EXCEL_SHEET.selectedCheck,
                color: EXCEL_SHEET.selectedCheck,
                bgcolor: '#fff',
                '&:hover': {
                  borderColor: EXCEL_SHEET.selectedCheck,
                  bgcolor: '#e8f5e9',
                },
              }}
            >
              {importing ? 'Importando…' : 'Importar planilha'}
            </Button>
          ) : null}
        </Box>

        {!visible ? (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              {emptyHint ??
                'Adicione lançamentos no formulário para ver a planilha ao vivo.'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflow: 'auto', maxHeight: readOnly ? 'none' : 'min(70vh, 720px)' }}>
            <Box className="excel-sheet-scroll">
              <Table size="small" stickyHeader sx={{ minWidth: 1400 }}>
                <TableHead>
                  <TableRow>
                    {!readOnly ? (
                      <TableCell
                        sx={{
                          ...headerSx,
                          bgcolor: EXCEL_SHEET.selectHeaderBg,
                          width: 52,
                          minWidth: 52,
                          textAlign: 'center',
                          px: 0.5,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.25,
                          }}
                        >
                          <Typography
                            component="span"
                            sx={{
                              fontWeight: 700,
                              lineHeight: 1,
                              fontSize: '10px',
                              color: EXCEL_SHEET.text,
                              letterSpacing: 0.4,
                            }}
                          >
                            IMH
                          </Typography>
                          <Checkbox
                            size="small"
                            checked={allSelected}
                            indeterminate={someSelected && !allSelected}
                            disabled={selecionaveis.length === 0 || isEnviando}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(_, checked) => toggleAll(checked)}
                            sx={{ p: 0, ...selectedCheckboxSx }}
                          />
                        </Box>
                      </TableCell>
                    ) : null}
                    {IMH_MEDICAMENTO_COLUNAS.map((col) => (
                      <TableCell
                        key={col.key}
                        sx={{ ...headerSx, minWidth: col.width, width: col.width }}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                    {!readOnly ? (
                      <TableCell sx={{ ...headerSx, width: 72, textAlign: 'center' }}>
                        Ações
                      </TableCell>
                    ) : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {value.linhas.map((linha, index) => {
                    const editing = editingLinhaId === linha.id
                    const finalizado = finalizedIds.has(linha.id)
                    const checked = finalizado || selection.has(linha.id)
                    return (
                      <TableRow
                        key={linha.id}
                        sx={{
                          bgcolor: editing
                            ? EXCEL_SHEET.selectedBg
                            : selection.has(linha.id)
                              ? EXCEL_SHEET.selectedBg
                              : undefined,
                          '&:hover td': { bgcolor: EXCEL_SHEET.hoverBg },
                        }}
                      >
                        {!readOnly ? (
                          <TableCell
                            sx={{
                              ...cellSx,
                              bgcolor: EXCEL_SHEET.selectHeaderBg,
                              textAlign: 'center',
                              px: 0.5,
                            }}
                          >
                            <Checkbox
                              size="small"
                              className={finalizado ? 'excel-checkbox-finalizado' : undefined}
                              checked={checked}
                              disabled={finalizado || isEnviando}
                              onChange={(_, nextChecked) => {
                                if (finalizado) return
                                toggleRow(linha, nextChecked)
                              }}
                              sx={{
                                p: 0,
                                ...(finalizado ? finalizedCheckboxSx : selectedCheckboxSx),
                              }}
                            />
                          </TableCell>
                        ) : null}
                        {IMH_MEDICAMENTO_COLUNAS.map((col) => (
                          <TableCell
                            key={col.key}
                            sx={{
                              ...cellSx,
                              ...(IMH_MEDICAMENTO_WRAP_KEYS.has(col.key)
                                ? {
                                    whiteSpace: 'pre-wrap',
                                    maxWidth: col.width + 40,
                                    minWidth: 120,
                                  }
                                : null),
                            }}
                          >
                            {dash(String(linha[col.key] ?? ''))}
                          </TableCell>
                        ))}
                        {!readOnly ? (
                          <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                            <IconButton
                              size="small"
                              aria-label={`Editar linha PME ${index + 1}`}
                              onClick={() => onEditLinha?.(linha.id)}
                              disabled={isEnviando}
                              sx={{ p: 0.35 }}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={`Excluir linha PME ${index + 1}`}
                              onClick={() => onDeleteLinha?.(linha.id)}
                              disabled={isEnviando}
                              sx={{ p: 0.35 }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    )
                  })}
                  {value.linhas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colCount} sx={{ ...cellSx, color: EXCEL_SHEET.mutedText }}>
                        Nenhum lançamento
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
