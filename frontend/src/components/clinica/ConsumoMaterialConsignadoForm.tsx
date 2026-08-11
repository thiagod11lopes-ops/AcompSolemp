import { useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Paper,
  Snackbar,
  Typography,
  alpha,
} from '@mui/material'
import { ConsumoMaterialManualForm } from '@/components/clinica/ConsumoMaterialManualForm'
import { ConsumoMaterialPlanilhaPreview } from '@/components/clinica/ConsumoMaterialPlanilhaPreview'
import { ConmedEscolherAbaModal } from '@/components/clinica/ConmedEscolherAbaModal'
import {
  parseConsumoMaterialFromGrid,
  parseSpreadsheetSheetsFile,
  type ConsumoMaterialRow,
  type SpreadsheetSheetImport,
} from '@/utils/consumoMaterialOds'
import { renumerarLinhasConsumo } from '@/utils/consumoMaterialTemplate'

interface ConsumoMaterialConsignadoFormProps {
  value: ConsumoMaterialRow[]
  onChange: (next: ConsumoMaterialRow[]) => void
}

function sheetHasContent(sheet: SpreadsheetSheetImport): boolean {
  return sheet.rows.some((row) => row.some((cell) => String(cell ?? '').trim()))
}

export function ConsumoMaterialConsignadoForm({
  value,
  onChange,
}: ConsumoMaterialConsignadoFormProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [sheetPicker, setSheetPicker] = useState<{
    open: boolean
    fileName: string
    sheets: SpreadsheetSheetImport[]
  }>({ open: false, fileName: '', sheets: [] })
  const [importFeedback, setImportFeedback] = useState<{
    open: boolean
    severity: 'success' | 'error'
    message: string
  }>({ open: false, severity: 'success', message: '' })

  const nextNumero = useMemo(() => {
    if (editingRowId) {
      const current = value.find((r) => r.id === editingRowId)
      if (current?.numero) return current.numero
    }
    return String(value.length + 1)
  }, [editingRowId, value])

  const editingRow = useMemo(
    () => (editingRowId ? value.find((r) => r.id === editingRowId) ?? null : null),
    [editingRowId, value],
  )

  const applyImportedSheet = (sheet: SpreadsheetSheetImport) => {
    try {
      const parsed = renumerarLinhasConsumo(parseConsumoMaterialFromGrid(sheet.rows))
      onChange(parsed)
      setEditingRowId(null)
      setImportFeedback({
        open: true,
        severity: 'success',
        message: `Planilha importada${sheet.nome ? ` (aba “${sheet.nome}”)` : ''}: ${parsed.length} lançamento(s).`,
      })
    } catch (err) {
      setImportFeedback({
        open: true,
        severity: 'error',
        message: err instanceof Error ? err.message : 'Falha ao interpretar a planilha.',
      })
    }
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    try {
      const sheets = (await parseSpreadsheetSheetsFile(file)).filter(sheetHasContent)
      if (sheets.length === 0) {
        setImportFeedback({
          open: true,
          severity: 'error',
          message: 'O arquivo não contém abas legíveis.',
        })
        return
      }
      if (sheets.length === 1) {
        applyImportedSheet(sheets[0])
        return
      }
      setSheetPicker({ open: true, fileName: file.name, sheets })
    } catch (err) {
      setImportFeedback({
        open: true,
        severity: 'error',
        message: err instanceof Error ? err.message : 'Falha ao ler a planilha.',
      })
    } finally {
      setImporting(false)
    }
  }

  const handleConfirmSheet = (sheetIndex: number) => {
    const sheet = sheetPicker.sheets[sheetIndex]
    setSheetPicker({ open: false, fileName: '', sheets: [] })
    if (sheet) applyImportedSheet(sheet)
  }

  const handleAddOrUpdate = (row: ConsumoMaterialRow) => {
    if (editingRowId) {
      const next = value.map((item) =>
        item.id === editingRowId ? { ...row, id: editingRowId } : item,
      )
      onChange(renumerarLinhasConsumo(next))
      setEditingRowId(null)
      return
    }
    onChange(renumerarLinhasConsumo([...value, row]))
  }

  const handleEdit = (rowId: string) => {
    setEditingRowId(rowId)
  }

  const handleDelete = (rowId: string) => {
    const next = value.filter((r) => r.id !== rowId)
    onChange(renumerarLinhasConsumo(next))
    if (editingRowId === rowId) setEditingRowId(null)
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(300px, 380px) minmax(0, 1fr)' },
        gap: 1.5,
        alignItems: 'start',
      }}
    >
      <Paper
        elevation={0}
        sx={(theme) => ({
          p: 1,
          borderRadius: 1.5,
          border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.95),
          position: { lg: 'sticky' },
          top: { lg: 8 },
          maxHeight: { lg: 'calc(100vh - 88px)' },
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        })}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, mb: 0.5, display: 'block', letterSpacing: 0.2 }}
        >
          {editingRow ? 'Editando lançamento' : 'Novo lançamento'}
        </Typography>
        <ConsumoMaterialManualForm
          key={editingRow?.id ?? 'new'}
          nextNumero={nextNumero}
          editingRow={editingRow}
          onCancelEdit={() => setEditingRowId(null)}
          onAddRow={handleAddOrUpdate}
          compact
        />
      </Paper>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, mb: 0.75, color: 'text.secondary', fontSize: '0.75rem' }}
        >
          Planilha (ao vivo)
        </Typography>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet"
          hidden
          onChange={handleImportFileChange}
        />
        <ConsumoMaterialPlanilhaPreview
          rows={value}
          editingRowId={editingRowId}
          importing={importing}
          onImportClick={handleImportClick}
          onEditRow={handleEdit}
          onDeleteRow={handleDelete}
        />
        <ConmedEscolherAbaModal
          open={sheetPicker.open}
          sheetNames={sheetPicker.sheets.map((s) => s.nome)}
          fileName={sheetPicker.fileName}
          description={
            sheetPicker.fileName
              ? `O arquivo “${sheetPicker.fileName}” tem várias abas. Selecione qual deve preencher o Consumo Material Consignado.`
              : 'O arquivo tem várias abas. Selecione qual deve preencher o Consumo Material Consignado.'
          }
          onCancel={() => setSheetPicker({ open: false, fileName: '', sheets: [] })}
          onConfirm={handleConfirmSheet}
        />
        <Snackbar
          open={importFeedback.open}
          autoHideDuration={5000}
          onClose={() => setImportFeedback((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={importFeedback.severity}
            variant="filled"
            onClose={() => setImportFeedback((prev) => ({ ...prev, open: false }))}
          >
            {importFeedback.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  )
}
