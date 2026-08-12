import { useRef, useState } from 'react'
import { Add as AddIcon, MenuBookOutlined as MenuBookIcon } from '@mui/icons-material'
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
import type { ListaMedicamentosFormData, ListaMedicamentosLinha } from '@/types'
import { ConmedEscolherAbaModal } from '@/components/clinica/ConmedEscolherAbaModal'
import { ListaMedicamentosPlanilhaPreview } from '@/components/clinica/ListaMedicamentosPlanilhaPreview'
import { MedicamentoAbasExplicacaoModal } from '@/components/clinica/MedicamentoAbasExplicacaoModal'
import {
  createEmptyListaMedicamentosLinha,
  formatListaMedNeb,
  formatListaMedNome,
  formatListaMedPreco,
  formatListaMedQtd,
  formatListaMedUf,
  linhaListaMedicamentosHasContent,
  normalizeListaMedicamentosForm,
  withNormalizedListaMedicamentosLinha,
} from '@/utils/listaMedicamentosForm'
import {
  findListaMedicamentosSheetIndex,
  loadListaMedicamentosSheetsFromFile,
  mergeListaMedicamentosImport,
  parseListaMedicamentosFromGrid,
} from '@/utils/listaMedicamentosImport'
import type { SpreadsheetSheetImport } from '@/utils/consumoMaterialOds'

interface ListaMedicamentosFormProps {
  value: ListaMedicamentosFormData
  onChange: (next: ListaMedicamentosFormData) => void
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

function cloneLinha(linha: ListaMedicamentosLinha): ListaMedicamentosLinha {
  return { ...linha }
}

export function ListaMedicamentosForm({ value, onChange }: ListaMedicamentosFormProps) {
  const [linhaDraft, setLinhaDraft] = useState<ListaMedicamentosLinha>(() =>
    createEmptyListaMedicamentosLinha(),
  )
  const [editingLinhaId, setEditingLinhaId] = useState<string | null>(null)
  const linhaSnapshotRef = useRef<ListaMedicamentosLinha | null>(null)
  const linhaFormRef = useRef<HTMLDivElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [explicacaoOpen, setExplicacaoOpen] = useState(false)
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
    const parsed = normalizeListaMedicamentosForm(parseListaMedicamentosFromGrid(sheet.rows))
    if (parsed.linhas.length === 0) {
      setImportFeedback({
        open: true,
        severity: 'error',
        message:
          'Não foi possível identificar a lista de medicamentos nessa aba. Verifique se há as colunas NEB, Medicamento, UF e Preço.',
      })
      return
    }
    onChange(mergeListaMedicamentosImport(value, parsed))
    setImportFeedback({
      open: true,
      severity: 'success',
      message: `Planilha importada${sheet.nome ? ` (aba “${sheet.nome}”)` : ''}: ${parsed.linhas.length} medicamento(s).`,
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
      const sheets = await loadListaMedicamentosSheetsFromFile(file)
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
      const preferred = findListaMedicamentosSheetIndex(sheets)
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

  const persistLinhas = (linhas: ListaMedicamentosLinha[]) => {
    onChange({
      linhas: linhas
        .map(withNormalizedListaMedicamentosLinha)
        .filter((l) => linhaListaMedicamentosHasContent(l)),
    })
  }

  const syncDraftToList = (nextDraft: ListaMedicamentosLinha) => {
    const ready = withNormalizedListaMedicamentosLinha(nextDraft)
    setLinhaDraft(ready)
    if (!editingLinhaId) return
    persistLinhas(
      value.linhas.map((l) => (l.id === editingLinhaId ? { ...ready, id: editingLinhaId } : l)),
    )
  }

  const updateDraft = (patch: Partial<Omit<ListaMedicamentosLinha, 'id'>>) => {
    syncDraftToList({ ...linhaDraft, ...patch })
  }

  const resetLinhaForm = () => {
    setLinhaDraft(createEmptyListaMedicamentosLinha())
    setEditingLinhaId(null)
    linhaSnapshotRef.current = null
  }

  const handleAdicionarLinha = () => {
    const ready = withNormalizedListaMedicamentosLinha(linhaDraft)
    if (editingLinhaId) {
      persistLinhas(
        value.linhas.map((l) =>
          l.id === editingLinhaId ? { ...ready, id: editingLinhaId } : l,
        ),
      )
      resetLinhaForm()
      return
    }
    if (!linhaListaMedicamentosHasContent(ready) || !ready.medicamento.trim()) {
      if (!ready.medicamento.trim() && linhaListaMedicamentosHasContent(ready)) {
        setImportFeedback({
          open: true,
          severity: 'error',
          message: 'Informe o nome do medicamento.',
        })
      }
      if (!linhaListaMedicamentosHasContent(ready)) resetLinhaForm()
      return
    }
    persistLinhas([...value.linhas, ready])
    resetLinhaForm()
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
        gridTemplateColumns: { xs: '1fr', xl: 'minmax(320px, 380px) minmax(0, 1fr)' },
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
            Entrada — Lista de Medicamentos
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            Catálogo com NEB, medicamento, UF, QTD, estoque baixo e preço. A tabela à direita
            atualiza ao vivo.
          </Typography>
        </Box>

        <Box ref={linhaFormRef}>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem', lineHeight: 1.2 }}
          >
            {editingLinhaId ? 'Editando medicamento' : 'Novo medicamento'}
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
              label="NEB"
              value={linhaDraft.neb}
              onChange={(e) => updateDraft({ neb: formatListaMedNeb(e.target.value) })}
              placeholder="BR3268550"
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="UF"
              value={linhaDraft.uf}
              onChange={(e) => updateDraft({ uf: formatListaMedUf(e.target.value) })}
              placeholder="SE"
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="Medicamento"
              value={linhaDraft.medicamento}
              onChange={(e) => updateDraft({ medicamento: formatListaMedNome(e.target.value) })}
              size="small"
              fullWidth
              multiline
              minRows={2}
              sx={multilineFieldSx}
            />
            <TextField
              label="QTD"
              value={linhaDraft.qtd}
              onChange={(e) => updateDraft({ qtd: formatListaMedQtd(e.target.value) })}
              placeholder="0"
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="Estoque Baixo"
              value={linhaDraft.estoqueBaixo}
              onChange={(e) => updateDraft({ estoqueBaixo: formatListaMedQtd(e.target.value) })}
              placeholder="Limiar de alerta"
              size="small"
              fullWidth
              helperText="QTD ≤ limiar → laranja; QTD = 0 → vermelho"
              sx={compactFieldSx}
            />
            <TextField
              label="Preço referência 2026"
              value={linhaDraft.precoReferencia}
              onChange={(e) => updateDraft({ precoReferencia: e.target.value })}
              onBlur={() =>
                updateDraft({
                  precoReferencia: formatListaMedPreco(linhaDraft.precoReferencia),
                })
              }
              placeholder="R$ 0,00"
              size="small"
              fullWidth
              sx={{ ...compactFieldSx, gridColumn: { sm: '1 / -1' } }}
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
              {editingLinhaId ? 'Salvar medicamento' : 'Adicionar medicamento'}
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
        <Button
          size="small"
          variant="outlined"
          startIcon={<MenuBookIcon sx={{ fontSize: 16 }} />}
          onClick={() => setExplicacaoOpen(true)}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            fontSize: 12,
            borderRadius: 2,
            justifySelf: 'stretch',
          }}
        >
          Explicação Detalhada
        </Button>
      </Paper>

      <Box sx={{ minWidth: 0 }}>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet"
          hidden
          onChange={handleImportFileChange}
        />
        <ListaMedicamentosPlanilhaPreview
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
              ? `O arquivo “${sheetPicker.fileName}” tem várias abas. Escolha qual aba deseja importar (ex.: Planilha1).`
              : 'O arquivo tem várias abas. Escolha qual aba deseja importar.'
          }
          onCancel={() =>
            setSheetPicker({ open: false, fileName: '', sheets: [], initialSheetIndex: 0 })
          }
          onConfirm={handleConfirmSheet}
        />
        <MedicamentoAbasExplicacaoModal
          open={explicacaoOpen}
          onClose={() => setExplicacaoOpen(false)}
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
