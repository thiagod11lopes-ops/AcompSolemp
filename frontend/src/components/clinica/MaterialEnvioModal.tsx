import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  IconButton,
  Paper,
  Stack,
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
import DownloadIcon from '@mui/icons-material/Download'
import InventoryIcon from '@mui/icons-material/Inventory'
import SendIcon from '@mui/icons-material/Send'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { formatValorBrasileiro, type ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import type { MesConsumoModelo } from '@/utils/consumoMaterialTemplate'
import {
  CONTROLE_SOLEMP_COLUNAS,
  buildControleSolempFromConsumo,
  calcularTotalControleSolemp,
  type ControleSolempColunaKey,
  type ControleSolempLinha,
  type ControleSolempPlanilha,
} from '@/utils/controleSolempTemplate'
import {
  downloadControleSolempOds,
  getControleSolempOdsFileName,
} from '@/utils/controleSolempOdsExport'
import { SpreadsheetEditableCell } from '@/components/clinica/SpreadsheetEditableCell'
import { EXCEL_SHEET } from '@/components/clinica/spreadsheetExcelTheme'
import '@/components/clinica/spreadsheet-excel.css'

const GROUP_SPANS = [
  { label: 'Identificação', span: 5 },
  { label: 'Material / contratação', span: 3 },
  { label: 'Valores', span: 3 },
  { label: 'Empenho / NE', span: 7 },
  { label: 'NF / Pagamento', span: 6 },
] as const

interface MaterialEnvioModalProps {
  open: boolean
  consumoRows: ConsumoMaterialRow[]
  mesReferencia?: MesConsumoModelo
  isSubmitting?: boolean
  previewOnly?: boolean
  onClose: () => void
  onConfirm: (planilha: ControleSolempPlanilha) => void
  planilhaInicial?: ControleSolempPlanilha | null
  title?: string
}

export function MaterialEnvioModal({
  open,
  consumoRows,
  mesReferencia,
  isSubmitting = false,
  previewOnly = false,
  onClose,
  onConfirm,
  planilhaInicial = null,
  title,
}: MaterialEnvioModalProps) {
  const [linhas, setLinhas] = useState<ControleSolempLinha[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const rowIdsKey = useMemo(
    () => consumoRows.map((r) => r.id).sort().join(','),
    [consumoRows],
  )

  useEffect(() => {
    if (!open) return
    if (planilhaInicial?.linhas?.length) {
      setLinhas(planilhaInicial.linhas.map((linha) => ({ ...linha })))
      return
    }
    if (consumoRows.length === 0) {
      setLinhas([])
      return
    }
    setLinhas(buildControleSolempFromConsumo(consumoRows, mesReferencia).linhas)
  }, [open, consumoRows, mesReferencia, planilhaInicial, rowIdsKey])

  const totalGeral = calcularTotalControleSolemp(linhas)
  const tableMinWidth = CONTROLE_SOLEMP_COLUNAS.reduce((sum, col) => sum + col.width, 0)
  const busy = isSubmitting || isGenerating
  const readOnly = previewOnly || Boolean(planilhaInicial)

  const handleLinhaChange = (id: string, field: string, value: string) => {
    if (readOnly) return
    const key = field as ControleSolempColunaKey
    setLinhas((prev) =>
      prev.map((linha) => {
        if (linha.id !== id) return linha
        const next = { ...linha, [key]: value }
        if (key === 'valorUnitario' || key === 'qtdSol') {
          const qtd = parseFloat(String(next.qtdSol).replace(',', '.')) || 1
          const unitClean = String(next.valorUnitario).replace(/[R$\s.]/g, '').replace(',', '.')
          const unit = parseFloat(unitClean)
          if (Number.isFinite(unit)) {
            const total = formatValorBrasileiro(unit * qtd)
            next.total = total
            next.pendencia = total
          }
        }
        if (key === 'total') {
          next.pendencia = value
        }
        return next
      }),
    )
  }

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
  }

  const handleGerarPlanilha = async () => {
    setExportError(null)
    setIsGenerating(true)
    try {
      await downloadControleSolempOds({ linhas }, getControleSolempOdsFileName())
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Erro ao gerar planilha')
    } finally {
      setIsGenerating(false)
    }
  }

  const modalTitle =
    title ??
    (readOnly
      ? 'Controle SOLEMP — Visualização'
      : 'Controle SOLEMP — Confecção de Solemp')

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullScreen>
      <AppBar position="relative" color="secondary" elevation={0}>
        <Toolbar variant="dense" sx={{ minHeight: 48, gap: 1 }}>
          <InventoryIcon />
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
            {modalTitle}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {linhas.length} linha(s)
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} disabled={busy} aria-label="Fechar">
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        className="excel-sheet"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 48px)',
          bgcolor: EXCEL_SHEET.sheetBg,
        }}
      >
        <Box className="excel-sheet-toolbar" sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontSize: '11px', color: EXCEL_SHEET.mutedText }}>
            Formato visual da planilha Consumo Material Consignado · colunas do Controle SOLEMP
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          className="excel-sheet-summary"
          sx={{ px: 2, py: 0.75 }}
        >
          <Typography sx={{ fontSize: '11px', color: EXCEL_SHEET.mutedText }}>
            Total:{' '}
            <strong style={{ color: EXCEL_SHEET.text }}>{formatValorBrasileiro(totalGeral)}</strong>
          </Typography>
          {!readOnly && (
            <Typography sx={{ fontSize: '10px', color: EXCEL_SHEET.mutedText }}>
              Clique nas células para editar · colunas sem origem na clínica permanecem em branco
            </Typography>
          )}
        </Stack>

        {exportError && (
          <Typography color="error" variant="body2" sx={{ px: 2, py: 1 }}>
            {exportError}
          </Typography>
        )}

        <Paper
          elevation={0}
          sx={{
            flex: 1,
            mx: 1.5,
            mb: 1,
            border: EXCEL_SHEET.border,
            overflow: 'hidden',
            bgcolor: EXCEL_SHEET.sheetBg,
          }}
        >
          <TableContainer className="excel-sheet-grid" sx={{ maxHeight: '100%', height: '100%' }}>
            <Table
              stickyHeader
              size="small"
              sx={{
                tableLayout: 'fixed',
                width: tableMinWidth,
                minWidth: tableMinWidth,
              }}
            >
              <colgroup>
                {CONTROLE_SOLEMP_COLUNAS.map((col) => (
                  <col key={col.key} style={{ width: col.width, minWidth: col.width }} />
                ))}
              </colgroup>
              <TableHead>
                <TableRow>
                  {GROUP_SPANS.map((group) => (
                    <TableCell
                      key={group.label}
                      colSpan={group.span}
                      align="center"
                      className="excel-group-header"
                      sx={{ py: 0.5 }}
                    >
                      {group.label}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  {CONTROLE_SOLEMP_COLUNAS.map((col) => (
                    <TableCell
                      key={col.key}
                      className="excel-col-header"
                      sx={{
                        width: col.width,
                        minWidth: col.width,
                        maxWidth: col.width,
                      }}
                      title={col.label}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {linhas.map((linha) => (
                  <TableRow key={linha.id} hover className="excel-data-row">
                    {CONTROLE_SOLEMP_COLUNAS.map((col) => (
                      <TableCell
                        key={col.key}
                        sx={{
                          width: col.width,
                          minWidth: col.width,
                          maxWidth: col.width,
                          p: 0,
                          bgcolor: EXCEL_SHEET.cellBg,
                        }}
                      >
                        {readOnly ? (
                          <Box
                            component="span"
                            className="excel-cell-readonly"
                            sx={{
                              display: 'block',
                              px: 0.75,
                              py: 0.35,
                              fontFamily: EXCEL_SHEET.fontFamily,
                              fontSize: EXCEL_SHEET.fontSize,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={linha[col.key]}
                          >
                            {linha[col.key] || ' '}
                          </Box>
                        ) : (
                          <SpreadsheetEditableCell
                            rowId={linha.id}
                            field={col.key}
                            value={linha[col.key]}
                            onCellChange={handleLinhaChange}
                            onContextMenu={handleContextMenu}
                          />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {linhas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={CONTROLE_SOLEMP_COLUNAS.length}>
                      <Typography color="text.secondary" sx={{ p: 2, fontSize: '11px' }}>
                        Nenhum lançamento selecionado.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <DialogActions
          sx={{
            px: 2,
            py: 1.25,
            gap: 1,
            bgcolor: EXCEL_SHEET.toolbarBg,
            borderTop: EXCEL_SHEET.border,
          }}
        >
          <Button onClick={onClose} disabled={busy} color="inherit" size="small">
            {readOnly ? 'Fechar' : 'Cancelar'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => void handleGerarPlanilha()}
            disabled={busy || linhas.length === 0}
          >
            {isGenerating ? 'Gerando...' : 'Gerar .ods'}
          </Button>
          {!readOnly && (
            <Button
              variant="contained"
              size="small"
              startIcon={<SendIcon />}
              onClick={() => onConfirm({ linhas })}
              disabled={busy || linhas.length === 0}
              sx={{ fontWeight: 700 }}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar para Conf. de Solemp'}
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  )
}
