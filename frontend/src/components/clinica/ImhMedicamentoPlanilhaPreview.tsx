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
import type { ImhMedicamentoFormData } from '@/types'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import {
  IMH_MEDICAMENTO_COLUNAS,
  IMH_MEDICAMENTO_WRAP_KEYS,
  calcImhMedicamentoTotalGeral,
  imhMedicamentoHasPreviewContent,
} from '@/utils/imhMedicamentoForm'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'
import '@/components/clinica/spreadsheet-excel.css'

interface ImhMedicamentoPlanilhaPreviewProps {
  value: ImhMedicamentoFormData
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

export function ImhMedicamentoPlanilhaPreview({
  value,
  editingLinhaId = null,
  importing = false,
  onImportClick,
  onEditLinha,
  onDeleteLinha,
}: ImhMedicamentoPlanilhaPreviewProps) {
  const visible = imhMedicamentoHasPreviewContent(value)
  const total = calcImhMedicamentoTotalGeral(value)
  const colCount = IMH_MEDICAMENTO_COLUNAS.length + 1

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
          {total > 0 ? (
            <Chip
              size="small"
              variant="outlined"
              label={formatValorBrasileiro(total)}
              sx={{ height: 22, fontWeight: 600 }}
            />
          ) : null}
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
              Preencha os lançamentos — ou importe o Modelo IHM — PME — para ver a planilha ao
              vivo.
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
              <Table size="small" sx={{ width: 'auto', tableLayout: 'auto' }}>
                <TableHead>
                  <TableRow>
                    {IMH_MEDICAMENTO_COLUNAS.map((col) => (
                      <TableCell key={col.key} sx={{ ...headerSx, minWidth: col.width }}>
                        {col.label}
                      </TableCell>
                    ))}
                    <TableCell sx={{ ...headerSx, textAlign: 'center', minWidth: 72 }}>
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
                        <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                          <IconButton
                            size="small"
                            aria-label={`Editar linha PME ${index + 1}`}
                            onClick={() => onEditLinha?.(linha.id)}
                            sx={{ p: 0.35 }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Excluir linha PME ${index + 1}`}
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
