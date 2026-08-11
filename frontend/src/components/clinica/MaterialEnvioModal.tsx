import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import InventoryIcon from '@mui/icons-material/Inventory'
import SendIcon from '@mui/icons-material/Send'
import { useEffect, useMemo, useState } from 'react'
import { formatValorBrasileiro, type ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import type { MesConsumoModelo } from '@/utils/consumoMaterialTemplate'
import {
  CONTROLE_SOLEMP_COLUNAS,
  buildControleSolempFromConsumo,
  calcularTotalControleSolemp,
  downloadControleSolempCsv,
  getControleSolempCsvFileName,
  type ControleSolempColunaKey,
  type ControleSolempLinha,
  type ControleSolempPlanilha,
} from '@/utils/controleSolempTemplate'

interface MaterialEnvioModalProps {
  open: boolean
  consumoRows: ConsumoMaterialRow[]
  mesReferencia?: MesConsumoModelo
  isSubmitting?: boolean
  previewOnly?: boolean
  onClose: () => void
  onConfirm: (planilha: ControleSolempPlanilha) => void
  /** Quando presente, modal só visualiza a planilha já enviada. */
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
  const busy = isSubmitting || isGenerating
  const readOnly = previewOnly || Boolean(planilhaInicial)

  const handleLinhaChange = (id: string, field: ControleSolempColunaKey, value: string) => {
    if (readOnly) return
    setLinhas((prev) =>
      prev.map((linha) => {
        if (linha.id !== id) return linha
        const next = { ...linha, [field]: value }
        if (field === 'valorUnitario' || field === 'qtdSol') {
          const qtd = parseFloat(String(next.qtdSol).replace(',', '.')) || 1
          const unitClean = String(next.valorUnitario).replace(/[R$\s.]/g, '').replace(',', '.')
          const unit = parseFloat(unitClean)
          if (Number.isFinite(unit)) {
            const total = formatValorBrasileiro(unit * qtd)
            next.total = total
            next.pendencia = total
          }
        }
        if (field === 'total') {
          next.pendencia = value
        }
        return next
      }),
    )
  }

  const handleGerarPlanilha = () => {
    setExportError(null)
    setIsGenerating(true)
    try {
      downloadControleSolempCsv({ linhas }, getControleSolempCsvFileName())
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Erro ao gerar planilha')
    } finally {
      setIsGenerating(false)
    }
  }

  const modalTitle =
    title ??
    (previewOnly || planilhaInicial
      ? 'Controle SOLEMP — Visualização'
      : 'Controle SOLEMP — Confecção de Solemp')

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullScreen>
      <AppBar
        sx={{
          position: 'relative',
          bgcolor: (t) =>
            alpha(t.palette.secondary.main, 0.95),
        }}
        color="secondary"
      >
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

      <DialogTitle sx={{ py: 1.25, px: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Planilha no formato Controle SOLEMP. Colunas sem correspondência na clínica ficam em
          branco.
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {exportError && (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography color="error" variant="body2">
              {exportError}
            </Typography>
          </Box>
        )}
        <TableContainer sx={{ maxHeight: 'calc(100vh - 220px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {CONTROLE_SOLEMP_COLUNAS.map((col) => (
                  <TableCell
                    key={col.key}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      whiteSpace: 'nowrap',
                      minWidth: col.width,
                      bgcolor: 'background.paper',
                    }}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {linhas.map((linha) => (
                <TableRow key={linha.id} hover>
                  {CONTROLE_SOLEMP_COLUNAS.map((col) => (
                    <TableCell key={col.key} sx={{ py: 0.5, px: 0.75 }}>
                      <TextField
                        value={linha[col.key]}
                        onChange={(e) => handleLinhaChange(linha.id, col.key, e.target.value)}
                        size="small"
                        fullWidth
                        disabled={readOnly || busy}
                        variant="standard"
                        slotProps={{
                          input: {
                            disableUnderline: readOnly,
                            sx: { fontSize: '0.75rem' },
                          },
                        }}
                        placeholder={readOnly ? undefined : '—'}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {linhas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={CONTROLE_SOLEMP_COLUNAS.length}>
                    <Typography color="text.secondary" sx={{ p: 2 }}>
                      Nenhum lançamento selecionado.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.25, gap: 1, justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 700, mr: 'auto' }}>
          Total: {formatValorBrasileiro(totalGeral)}
        </Typography>
        <Button onClick={onClose} disabled={busy} color="inherit" size="small">
          {readOnly ? 'Fechar' : 'Cancelar'}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={handleGerarPlanilha}
          disabled={busy || linhas.length === 0}
        >
          {isGenerating ? 'Gerando...' : 'Gerar .csv'}
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
    </Dialog>
  )
}
