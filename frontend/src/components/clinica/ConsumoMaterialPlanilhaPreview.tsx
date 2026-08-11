import {
  DeleteOutlined as DeleteIcon,
  EditOutlined as EditIcon,
  UploadFileOutlined as UploadFileIcon,
} from '@mui/icons-material'
import {
  Box,
  Button,
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
  emptyHint?: string
  onImportClick?: () => void
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

export function ConsumoMaterialPlanilhaPreview({
  rows,
  editingRowId = null,
  importing = false,
  emptyHint,
  onImportClick,
  onEditRow,
  onDeleteRow,
}: ConsumoMaterialPlanilhaPreviewProps) {
  const visible = rows.length > 0
  const groups = [
    { id: 'paciente', label: 'PACIENTE', keys: CONSUMO_MATERIAL_HEADERS.filter((h) => h.group === 'paciente') },
    { id: 'clinico', label: 'CLÍNICO', keys: CONSUMO_MATERIAL_HEADERS.filter((h) => h.group === 'clinico') },
    { id: 'financeiro', label: 'FINANCEIRO', keys: CONSUMO_MATERIAL_HEADERS.filter((h) => h.group === 'financeiro') },
  ]
  const colCount = CONSUMO_MATERIAL_HEADERS.length + 1

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
          {onImportClick ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
              onClick={onImportClick}
              disabled={importing}
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
                  return (
                    <TableRow
                      key={row.id}
                      sx={{
                        bgcolor: editing ? EXCEL_SHEET.selectedBg : undefined,
                        '&:hover td': { bgcolor: EXCEL_SHEET.hoverBg },
                      }}
                    >
                      {CONSUMO_MATERIAL_HEADERS.map((col) => (
                        <TableCell
                          key={col.key}
                          sx={{
                            ...cellSx,
                            ...(col.key === 'procedimento' || col.key === 'materiais' || col.key === 'diagnostico'
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
                          sx={{ p: 0.35 }}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Excluir lançamento ${index + 1}`}
                          onClick={() => onDeleteRow?.(row.id)}
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
