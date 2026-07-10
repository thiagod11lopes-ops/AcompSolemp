import {
  AppBar,
  Box,
  Button,
  Dialog,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import MedicationIcon from '@mui/icons-material/Medication'
import {
  CONSUMO_MEDICAMENTO_PME_HEADERS,
  formatValorBrasileiro,
  type ConsumoMaterialRow,
} from '@/utils/consumoMaterialOds'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import '@/components/clinica/spreadsheet-excel.css'

interface MedicamentoPmeVerificacaoModalProps {
  open: boolean
  rows: ConsumoMaterialRow[]
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function MedicamentoPmeVerificacaoModal({
  open,
  rows,
  isSubmitting = false,
  onClose,
  onConfirm,
}: MedicamentoPmeVerificacaoModalProps) {
  const total = rows.reduce((sum, row) => sum + (row.valorNumerico || 0), 0)
  const tableMinWidth = CONSUMO_MEDICAMENTO_PME_HEADERS.reduce((sum, col) => sum + col.width, 0)

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      slotProps={{
        paper: {
          sx: { display: 'flex', flexDirection: 'column', bgcolor: EXCEL_SHEET.sheetBg },
        },
      }}
    >
      <AppBar position="static" color="primary" elevation={1} sx={{ flexShrink: 0 }}>
        <Toolbar variant="dense" sx={{ gap: 1, minHeight: 48, px: { xs: 1, sm: 2 } }}>
          <MedicationIcon />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Verificação — Modelo IHM PME
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {rows.length} lançamento(s) selecionado(s) · Confira antes de enviar à Contabilidade/IMH
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
            Total: {formatValorBrasileiro(total)}
          </Typography>
          <IconButton
            edge="end"
            onClick={onClose}
            disabled={isSubmitting}
            color="inherit"
            aria-label="Fechar"
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <TableContainer sx={{ flex: 1, minHeight: 0 }} className="excel-sheet">
        <Table stickyHeader size="small" sx={{ minWidth: tableMinWidth }}>
          <TableHead>
            <TableRow>
              {CONSUMO_MEDICAMENTO_PME_HEADERS.map((col) => (
                <TableCell
                  key={col.key}
                  className="excel-header-cell"
                  sx={{
                    width: col.width,
                    minWidth: col.width,
                    bgcolor: EXCEL_SHEET.headerBg,
                    color: EXCEL_SHEET.text,
                    fontFamily: EXCEL_SHEET.fontFamily,
                    fontSize: EXCEL_SHEET.fontSize,
                    fontWeight: 700,
                    borderColor: EXCEL_SHEET.borderColor,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                hover
                sx={{
                  bgcolor: EXCEL_SHEET.cellBg,
                  '&:hover': { bgcolor: EXCEL_SHEET.hoverBg },
                }}
              >
                {CONSUMO_MEDICAMENTO_PME_HEADERS.map((col) => {
                  const value = String(row[col.key] ?? '')
                  const isPreco = col.key === 'valor' || col.key === 'valorUnitario'
                  return (
                    <TableCell
                      key={col.key}
                      sx={{
                        width: col.width,
                        minWidth: col.width,
                        borderColor: EXCEL_SHEET.borderColor,
                        py: 0.75,
                        px: 1,
                        fontFamily: EXCEL_SHEET.fontFamily,
                        fontSize: EXCEL_SHEET.fontSize,
                        color: EXCEL_SHEET.text,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Typography
                        component="span"
                        className={isPreco ? 'excel-cell-number' : undefined}
                        sx={{
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          color: 'inherit',
                        }}
                      >
                        {value || '\u00A0'}
                      </Typography>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={CONSUMO_MEDICAMENTO_PME_HEADERS.length}>
                  <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    Nenhum lançamento selecionado.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          flexShrink: 0,
          px: 2,
          py: 1.5,
          borderTop: EXCEL_SHEET.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          bgcolor: EXCEL_SHEET.toolbarBg,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Revise os itens marcados na coluna IMH. Ao confirmar, a timeline inicia em Contabilidade/IMH.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          <Button onClick={onClose} disabled={isSubmitting} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={onConfirm}
            disabled={isSubmitting || rows.length === 0}
            sx={{ fontWeight: 700 }}
          >
            {isSubmitting ? 'Enviando...' : 'Conf. Envio ao IMH'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}
