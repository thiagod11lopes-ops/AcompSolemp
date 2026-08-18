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
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  CONSUMO_MATERIAL_HEADERS,
  type ConsumoMaterialRow,
} from '@/utils/consumoMaterialOds'
import '@/components/clinica/spreadsheet-excel.css'

interface ConsumoMaterialPlanilhaPreviewProps {
  rows: ConsumoMaterialRow[]
  editingRowId?: string | null
  importing?: boolean
  enviando?: boolean
  selectedIds?: Set<string>
  finalizedIds?: Set<string>
  emptyHint?: string
  onImportClick?: () => void
  onEnviarClick?: () => void
  onToggleRow?: (rowId: string) => void
  onToggleAllVisible?: (checked: boolean) => void
  onEditRow?: (rowId: string) => void
  onDeleteRow?: (rowId: string) => void
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

const groupSx = {
  ...headerSx,
  bgcolor: EXCEL_SHEET.groupBg,
  textAlign: 'center' as const,
  fontWeight: 800,
}

const miStickySx = {
  position: 'sticky' as const,
  left: 0,
  zIndex: 3,
}

export function ConsumoMaterialPlanilhaPreview({
  rows,
  editingRowId = null,
  importing = false,
  enviando = false,
  selectedIds,
  finalizedIds,
  emptyHint,
  onImportClick,
  onEnviarClick,
  onToggleRow,
  onToggleAllVisible,
  onEditRow,
  onDeleteRow,
}: ConsumoMaterialPlanilhaPreviewProps) {
  const visible = rows.length > 0
  const selectionEnabled = Boolean(onToggleRow)
  const selected = selectedIds ?? new Set<string>()
  const finalized = finalizedIds ?? new Set<string>()
  const selectableRows = rows.filter((row) => !finalized.has(row.id))
  const selectedCount = selectableRows.filter((row) => selected.has(row.id)).length
  const allVisibleSelected =
    selectableRows.length > 0 && selectableRows.every((row) => selected.has(row.id))
  const someVisibleSelected =
    selectableRows.some((row) => selected.has(row.id)) && !allVisibleSelected

  const groups = [
    { id: 'paciente', label: 'PACIENTE', keys: CONSUMO_MATERIAL_HEADERS.filter((h) => h.group === 'paciente') },
    { id: 'clinico', label: 'CLÍNICO', keys: CONSUMO_MATERIAL_HEADERS.filter((h) => h.group === 'clinico') },
    { id: 'financeiro', label: 'FINANCEIRO', keys: CONSUMO_MATERIAL_HEADERS.filter((h) => h.group === 'financeiro') },
    { id: 'medicamento', label: 'MEDICAMENTO', keys: CONSUMO_MATERIAL_HEADERS.filter((h) => h.group === 'medicamento') },
    { id: 'titular', label: 'TITULAR', keys: CONSUMO_MATERIAL_HEADERS.filter((h) => h.group === 'titular') },
    { id: 'imh', label: 'IMH', keys: CONSUMO_MATERIAL_HEADERS.filter((h) => h.group === 'imh') },
  ].filter((g) => g.keys.length > 0)
  const colCount = CONSUMO_MATERIAL_HEADERS.length + 1 + (selectionEnabled ? 1 : 0)

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
            CONSUMO MATERIAL CONSIGNADO
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={`${rows.length} lançamento(s)`}
            sx={{ height: 22, fontWeight: 600 }}
          />
          {selectedCount > 0 ? (
            <Chip
              size="small"
              color="primary"
              label={`MI: ${selectedCount}`}
              sx={{ height: 22, fontWeight: 700 }}
            />
          ) : null}
          {onEnviarClick ? (
            <Button
              size="small"
              variant="contained"
              startIcon={<SendIcon sx={{ fontSize: 16 }} />}
              onClick={onEnviarClick}
              disabled={enviando || selectedCount === 0}
              sx={{
                ml: 0.5,
                height: 26,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 12,
                boxShadow: 'none',
              }}
            >
              {enviando
                ? 'Enviando…'
                : selectedCount > 1
                  ? `Enviar para Confecção Solemp/Auditoria (${selectedCount})`
                  : 'Enviar para Confecção Solemp/Auditoria'}
            </Button>
          ) : null}
          {onImportClick ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
              onClick={onImportClick}
              disabled={importing || enviando}
              sx={{
                ml: onEnviarClick ? 0 : 0.5,
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
          <Box sx={{ px: 2.5, py: 4, textAlign: 'center', opacity: 0.55 }}>
            <Typography variant="body2" color="text.secondary">
              {emptyHint ??
                'Preencha o formulário ao lado ou importe uma planilha para montar a tabela.'}
            </Typography>
          </Box>
        ) : (
          <Box
            className="excel-sheet-grid"
            sx={{
              width: 'fit-content',
              maxWidth: '100%',
              overflowX: 'auto',
              p: 1.5,
              borderTop: EXCEL_SHEET.border,
              '& .MuiTable-root': {
                tableLayout: 'auto !important',
                width: 'max-content',
              },
            }}
          >
            <Table size="small" sx={{ width: 'auto', tableLayout: 'auto' }}>
              <TableHead>
                <TableRow>
                  {selectionEnabled ? (
                    <TableCell
                      rowSpan={2}
                      sx={{
                        ...groupSx,
                        ...miStickySx,
                        zIndex: 4,
                        minWidth: 44,
                        width: 44,
                        px: 0.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, lineHeight: 1 }}>MI</Typography>
                        <Checkbox
                          size="small"
                          checked={allVisibleSelected}
                          indeterminate={someVisibleSelected}
                          disabled={enviando || selectableRows.length === 0}
                          onChange={(_, checked) => onToggleAllVisible?.(checked)}
                          slotProps={{ input: { 'aria-label': 'Selecionar todos MI' } }}
                          sx={{ p: 0.25 }}
                        />
                      </Box>
                    </TableCell>
                  ) : null}
                  {groups.map((g) => (
                    <TableCell key={g.id} colSpan={g.keys.length} sx={groupSx}>
                      {g.label}
                    </TableCell>
                  ))}
                  <TableCell sx={{ ...groupSx, minWidth: 72 }}>AÇÕES</TableCell>
                </TableRow>
                <TableRow>
                  {CONSUMO_MATERIAL_HEADERS.map((col) => (
                    <TableCell key={col.key} sx={headerSx}>
                      {col.label}
                    </TableCell>
                  ))}
                  <TableCell sx={{ ...headerSx, textAlign: 'center' }}>AÇÕES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => {
                  const editing = editingRowId === row.id
                  const isFinalized = finalized.has(row.id)
                  const isChecked = isFinalized || selected.has(row.id)
                  return (
                    <TableRow
                      key={row.id}
                      sx={{
                        bgcolor: editing ? EXCEL_SHEET.selectedBg : undefined,
                        '&:hover td': { bgcolor: EXCEL_SHEET.hoverBg },
                      }}
                    >
                      {selectionEnabled ? (
                        <TableCell
                          sx={{
                            ...cellSx,
                            ...miStickySx,
                            textAlign: 'center',
                            px: 0.5,
                            bgcolor: isChecked ? EXCEL_SHEET.selectedBg : EXCEL_SHEET.cellBg,
                          }}
                        >
                          <Checkbox
                            size="small"
                            checked={isChecked}
                            disabled={enviando || isFinalized}
                            onChange={() => onToggleRow?.(row.id)}
                            slotProps={{
                              input: { 'aria-label': `Selecionar MI linha ${index + 1}` },
                            }}
                            sx={{ p: 0.25 }}
                          />
                        </TableCell>
                      ) : null}
                      {CONSUMO_MATERIAL_HEADERS.map((col) => (
                        <TableCell
                          key={col.key}
                          sx={{
                            ...cellSx,
                            ...(col.key === 'procedimento' ||
                            col.key === 'materiais' ||
                            col.key === 'diagnostico' ||
                            col.key === 'itemPme' ||
                            col.key === 'maneiraFornecimento'
                              ? {
                                  whiteSpace: 'pre-wrap',
                                  maxWidth: 220,
                                  minWidth: 120,
                                }
                              : null),
                          }}
                        >
                          {dash(String(row[col.key] ?? ''))}
                        </TableCell>
                      ))}
                      <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                        <IconButton
                          size="small"
                          aria-label={`Editar lançamento ${index + 1}`}
                          onClick={() => onEditRow?.(row.id)}
                          disabled={enviando}
                          sx={{ p: 0.35 }}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Excluir lançamento ${index + 1}`}
                          onClick={() => onDeleteRow?.(row.id)}
                          disabled={enviando}
                          sx={{ p: 0.35 }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={colCount}
                      sx={{ ...cellSx, color: EXCEL_SHEET.mutedText }}
                    >
                      Nenhum lançamento
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
