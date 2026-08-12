import { useMemo, useRef, useState } from 'react'
import { Add as AddIcon } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import type { ListaMateriaisFormData, ListaMateriaisLinha } from '@/types'
import { ConmedEscolherAbaModal } from '@/components/clinica/ConmedEscolherAbaModal'
import { ListaMateriaisPlanilhaPreview } from '@/components/clinica/ListaMateriaisPlanilhaPreview'
import {
  createEmptyListaMateriaisLinha,
  formatListaItem,
  formatListaMoeda,
  formatListaQuantidade,
  formatListaUppercase,
  linhaListaHasContent,
  nextListaItemNumero,
  normalizeListaMateriaisForm,
} from '@/utils/listaMateriaisForm'
import {
  findListaMateriaisSheetIndex,
  loadListaMateriaisSheetsFromFile,
  mergeListaMateriaisImport,
  parseListaMateriaisFromGrid,
} from '@/utils/listaMateriaisImport'
import type { SpreadsheetSheetImport } from '@/utils/consumoMaterialOds'

interface ListaMateriaisFormProps {
  value: ListaMateriaisFormData
  onChange: (next: ListaMateriaisFormData) => void
}

const compactFieldSx = {
  '& .MuiInputBase-root': { fontSize: '0.78rem' },
  '& .MuiInputBase-input': { fontSize: '0.78rem', py: 0.65 },
  '& .MuiInputLabel-root': { fontSize: '0.78rem' },
} as const

const multilineFieldSx = {
  ...compactFieldSx,
  gridColumn: '1 / -1',
  '& .MuiInputBase-root': {
    fontSize: '0.78rem',
    alignItems: 'flex-start',
  },
  '& .MuiInputBase-input': {
    fontSize: '0.78rem',
    lineHeight: 1.35,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
  },
} as const

function cloneLinha(linha: ListaMateriaisLinha): ListaMateriaisLinha {
  return { ...linha }
}

export function ListaMateriaisForm({ value, onChange }: ListaMateriaisFormProps) {
  const nextItem = useMemo(() => nextListaItemNumero(value.linhas), [value.linhas])
  const [linhaDraft, setLinhaDraft] = useState<ListaMateriaisLinha>(() => ({
    ...createEmptyListaMateriaisLinha(),
    item: nextItem,
  }))
  const [editingLinhaId, setEditingLinhaId] = useState<string | null>(null)
  const linhaSnapshotRef = useRef<ListaMateriaisLinha | null>(null)
  const linhaFormRef = useRef<HTMLDivElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [sheetPicker, setSheetPicker] = useState<{
    open: boolean
    fileName: string
    sheets: SpreadsheetSheetImport[]
    initialSheetIndex: number
  }>({ open: false, fileName: '', sheets: [], initialSheetIndex: 0 })
  const [importFeedback, setImportFeedback] = useState<{
    open: boolean
    severity: 'success' | 'error'
    message: string
  }>({ open: false, severity: 'success', message: '' })

  const applyImportedSheet = (sheet: SpreadsheetSheetImport) => {
    const parsed = normalizeListaMateriaisForm(parseListaMateriaisFromGrid(sheet.rows))
    const hasHeader = Boolean(parsed.apendice)
    const hasLinhas = parsed.linhas.length > 0
    if (!hasHeader && !hasLinhas) {
      setImportFeedback({
        open: true,
        severity: 'error',
        message:
          'Não foi possível identificar dados de Lista de Materiais nessa aba. Verifique o layout.',
      })
      return
    }
    onChange(mergeListaMateriaisImport(value, parsed))
    setImportFeedback({
      open: true,
      severity: 'success',
      message: `Planilha importada${sheet.nome ? ` (aba “${sheet.nome}”)` : ''}: ${parsed.linhas.length} item(ns).`,
    })
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
      const sheets = await loadListaMateriaisSheetsFromFile(file)
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
      const preferred = findListaMateriaisSheetIndex(sheets)
      setSheetPicker({
        open: true,
        fileName: file.name,
        sheets,
        initialSheetIndex: preferred >= 0 ? preferred : 0,
      })
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
    setSheetPicker({ open: false, fileName: '', sheets: [], initialSheetIndex: 0 })
    if (sheet) applyImportedSheet(sheet)
  }

  const persistLinhas = (linhas: ListaMateriaisLinha[]) => {
    onChange({
      ...value,
      linhas: linhas.filter((l) => linhaListaHasContent(l)),
    })
  }

  const syncDraftToList = (nextDraft: ListaMateriaisLinha) => {
    setLinhaDraft(nextDraft)
    if (!editingLinhaId) return
    persistLinhas(
      value.linhas.map((l) => (l.id === editingLinhaId ? { ...nextDraft, id: editingLinhaId } : l)),
    )
  }

  const updateDraft = (patch: Partial<Omit<ListaMateriaisLinha, 'id'>>) => {
    syncDraftToList({ ...linhaDraft, ...patch })
  }

  const resetLinhaForm = () => {
    setLinhaDraft({
      ...createEmptyListaMateriaisLinha(),
      item: nextListaItemNumero(value.linhas),
    })
    setEditingLinhaId(null)
    linhaSnapshotRef.current = null
  }

  const handleAdicionarLinha = () => {
    const ready = { ...linhaDraft }
    if (editingLinhaId) {
      persistLinhas(
        value.linhas.map((l) =>
          l.id === editingLinhaId ? { ...ready, id: editingLinhaId } : l,
        ),
      )
      resetLinhaForm()
      return
    }
    if (!linhaListaHasContent(ready)) {
      resetLinhaForm()
      return
    }
    if (!ready.item.trim()) ready.item = nextItem
    persistLinhas([...value.linhas, ready])
    setLinhaDraft({
      ...createEmptyListaMateriaisLinha(),
      item: nextListaItemNumero([...value.linhas, ready]),
    })
    setEditingLinhaId(null)
    linhaSnapshotRef.current = null
  }

  const handleEditLinha = (id: string) => {
    const found = value.linhas.find((l) => l.id === id)
    if (!found) return
    linhaSnapshotRef.current = cloneLinha(found)
    setEditingLinhaId(id)
    setLinhaDraft(cloneLinha(found))
    requestAnimationFrame(() => {
      linhaFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const handleDeleteLinha = (id: string) => {
    persistLinhas(value.linhas.filter((l) => l.id !== id))
    if (editingLinhaId === id) resetLinhaForm()
  }

  const handleCancelLinha = () => {
    if (editingLinhaId && linhaSnapshotRef.current) {
      persistLinhas(
        value.linhas.map((l) =>
          l.id === editingLinhaId ? cloneLinha(linhaSnapshotRef.current!) : l,
        ),
      )
    }
    resetLinhaForm()
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', xl: 'minmax(340px, 400px) minmax(0, 1fr)' },
        alignItems: 'start',
      }}
    >
      <Paper
        elevation={0}
        sx={(theme) => ({
          p: { xs: 1.25, md: 1.5 },
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
          bgcolor: alpha(theme.palette.primary.main, 0.02),
          display: 'grid',
          gap: 1.25,
          position: { xl: 'sticky' },
          top: { xl: 12 },
          maxHeight: { xl: 'calc(100vh - 120px)' },
          overflow: { xl: 'auto' },
        })}
      >
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: '0.9rem' }}
          >
            Entrada — Lista de Materiais
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            Apêndice/PE e itens da relação. A planilha segue o modelo do ODS e atualiza ao vivo.
          </Typography>
        </Box>

        <Box>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem', lineHeight: 1.2 }}
          >
            Cabeçalho
          </Typography>
          <TextField
            label="Apêndice / PE"
            value={value.apendice}
            onChange={(e) =>
              onChange({ ...value, apendice: formatListaUppercase(e.target.value) })
            }
            placeholder="APÊNDICE III - PE 90058/2025"
            size="small"
            fullWidth
            sx={{ ...compactFieldSx, mt: 0.5 }}
          />
        </Box>

        <Box ref={linhaFormRef}>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem', lineHeight: 1.2 }}
          >
            {editingLinhaId ? 'Editando item' : 'Novo item'}
          </Typography>
          <Box
            sx={{
              mt: 0.5,
              display: 'grid',
              gap: 0.85,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}
          >
            <TextField
              label="ITEM"
              value={linhaDraft.item}
              onChange={(e) => updateDraft({ item: formatListaItem(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="PI"
              value={linhaDraft.pi}
              onChange={(e) => updateDraft({ pi: formatListaUppercase(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="CATMAT"
              value={linhaDraft.catmat}
              onChange={(e) => updateDraft({ catmat: formatListaUppercase(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="LOTE"
              value={linhaDraft.lote}
              onChange={(e) => updateDraft({ lote: formatListaUppercase(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="ESPECIFICAÇÃO"
              value={linhaDraft.especificacao}
              onChange={(e) =>
                updateDraft({ especificacao: formatListaUppercase(e.target.value) })
              }
              size="small"
              fullWidth
              multiline
              minRows={3}
              sx={multilineFieldSx}
            />
            <TextField
              label="UF"
              value={linhaDraft.uf}
              onChange={(e) => updateDraft({ uf: formatListaUppercase(e.target.value) })}
              placeholder="UNIDADE"
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="QTD MÍN."
              value={linhaDraft.qtdMin}
              onChange={(e) => updateDraft({ qtdMin: formatListaQuantidade(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="QTD TOTAL"
              value={linhaDraft.qtdTotal}
              onChange={(e) => updateDraft({ qtdTotal: formatListaQuantidade(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="VALOR"
              value={linhaDraft.valor}
              onChange={(e) => updateDraft({ valor: formatListaMoeda(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="FORNECEDOR"
              value={linhaDraft.fornecedor}
              onChange={(e) => updateDraft({ fornecedor: formatListaUppercase(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdicionarLinha}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {editingLinhaId ? 'Salvar item' : 'Adicionar item'}
            </Button>
            {editingLinhaId ? (
              <Button
                size="small"
                variant="text"
                onClick={handleCancelLinha}
                sx={{ textTransform: 'none' }}
              >
                Cancelar
              </Button>
            ) : null}
          </Box>
        </Box>
      </Paper>

      <Box sx={{ minWidth: 0 }}>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet"
          hidden
          onChange={handleImportFileChange}
        />
        <ListaMateriaisPlanilhaPreview
          value={value}
          editingLinhaId={editingLinhaId}
          importing={importing}
          onImportClick={handleImportClick}
          onEditLinha={handleEditLinha}
          onDeleteLinha={handleDeleteLinha}
        />
        <ConmedEscolherAbaModal
          open={sheetPicker.open}
          sheetNames={sheetPicker.sheets.map((s) => s.nome)}
          fileName={sheetPicker.fileName}
          initialSheetIndex={sheetPicker.initialSheetIndex}
          description={
            sheetPicker.fileName
              ? `O arquivo “${sheetPicker.fileName}” tem várias abas. Escolha qual aba deseja importar.`
              : 'O arquivo tem várias abas. Escolha qual aba deseja importar.'
          }
          onCancel={() =>
            setSheetPicker({ open: false, fileName: '', sheets: [], initialSheetIndex: 0 })
          }
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
