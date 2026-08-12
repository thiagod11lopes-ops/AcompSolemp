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
import type { ListaMedicamentosFormData } from '@/types'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  LISTA_MEDICAMENTOS_COLUNAS,
  listaMedicamentosHasPreviewContent,
} from '@/utils/listaMedicamentosForm'
import '@/components/clinica/spreadsheet-excel.css'

interface ListaMedicamentosPlanilhaPreviewProps {
  value: ListaMedicamentosFormData
  editingLinhaId?: string | null
  importing?: boolean
  onImportClick?: () => void
  onEditLinha?: (linhaId: string) => void
  onDeleteLinha?: (linhaId: string) => void
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

export function ListaMedicamentosPlanilhaPreview({
  value,
  editingLinhaId = null,
  importing = false,
  onImportClick,
  onEditLinha,
  onDeleteLinha,
}: ListaMedicamentosPlanilhaPreviewProps) {
  const visible = listaMedicamentosHasPreviewContent(value)
  const colCount = LISTA_MEDICAMENTOS_COLUNAS.length + 1

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
            Lista de medicamentos com preços
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={`${value.linhas.length} medicamento(s)`}
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
              Adicione medicamentos — ou importe a planilha de preços — para ver a lista ao vivo.
            </Typography>
          </Box>
        ) : (
          <Box
            className="excel-sheet-grid"
            sx={{
              p: 1.5,
              borderTop: EXCEL_SHEET.border,
              width: 'fit-content',
              maxWidth: '100%',
              overflowX: 'auto',
              maxHeight: 'min(70vh, 720px)',
              overflowY: 'auto',
            }}
          >
            <Box
              sx={{
                width: 'fit-content',
                maxWidth: '100%',
                border: EXCEL_SHEET.border,
                borderRadius: 1,
                bgcolor: EXCEL_SHEET.sheetBg,
              }}
            >
              <Table size="small" stickyHeader sx={{ width: 'auto', tableLayout: 'auto' }}>
                <TableHead>
                  <TableRow>
                    {LISTA_MEDICAMENTOS_COLUNAS.map((col) => (
                      <TableCell
                        key={col.key}
                        sx={{
                          ...headerSx,
                          minWidth: col.width,
                          position: 'sticky',
                          top: 0,
                          zIndex: 2,
                        }}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                    <TableCell
                      sx={{
                        ...headerSx,
                        textAlign: 'center',
                        minWidth: 72,
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                      }}
                    >
                      AÇÕES
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {value.linhas.map((linha, index) => {
                    const editing = editingLinhaId === linha.id
                    return (
                      <TableRow
                        key={linha.id}
                        sx={{
                          bgcolor: editing ? EXCEL_SHEET.selectedBg : undefined,
                          '&:hover td': { bgcolor: EXCEL_SHEET.hoverBg },
                        }}
                      >
                        {LISTA_MEDICAMENTOS_COLUNAS.map((col) => (
                          <TableCell
                            key={col.key}
                            sx={{
                              ...cellSx,
                              ...(col.key === 'medicamento'
                                ? {
                                    whiteSpace: 'pre-wrap',
                                    maxWidth: col.width + 40,
                                    minWidth: 180,
                                  }
                                : null),
                            }}
                          >
                            {dash(String(linha[col.key] ?? ''))}
                          </TableCell>
                        ))}
                        <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                          <IconButton
                            size="small"
                            aria-label={`Editar medicamento ${index + 1}`}
                            onClick={() => onEditLinha?.(linha.id)}
                            sx={{ p: 0.35 }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Excluir medicamento ${index + 1}`}
                            onClick={() => onDeleteLinha?.(linha.id)}
                            sx={{ p: 0.35 }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {value.linhas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colCount} sx={{ ...cellSx, color: EXCEL_SHEET.mutedText }}>
                        Nenhum medicamento
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
