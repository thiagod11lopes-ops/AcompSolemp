import { useRef, useState } from 'react'
import { Add as AddIcon } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import type { ImhAbaFormData, ImhAbaLinha } from '@/types'
import { ConmedEscolherAbaModal } from '@/components/clinica/ConmedEscolherAbaModal'
import { ImhAbaPlanilhaPreview } from '@/components/clinica/ImhAbaPlanilhaPreview'
import {
  createEmptyImhAbaLinha,
  formatImhData,
  formatImhMoeda,
  formatImhNip,
  formatImhNumeroCp,
  formatImhQuantidade,
  formatImhUppercase,
  linhaHasContent,
  normalizeImhAbaForm,
  withRecalculatedImhLinha,
} from '@/utils/imhAbaForm'
import {
  findImhSheetIndex,
  loadImhSheetsFromFile,
  mergeImhImport,
  parseImhAbaFromGrid,
} from '@/utils/imhAbaImport'
import type { SpreadsheetSheetImport } from '@/utils/consumoMaterialOds'

interface ImhAbaFormProps {
  value: ImhAbaFormData
  onChange: (next: ImhAbaFormData) => void
}

const VINCULOS = ['TITULAR', 'DEPENDENTE', 'OUTRO'] as const

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

function cloneLinha(linha: ImhAbaLinha): ImhAbaLinha {
  return { ...linha }
}

export function ImhAbaForm({ value, onChange }: ImhAbaFormProps) {
  const [linhaDraft, setLinhaDraft] = useState<ImhAbaLinha>(() => createEmptyImhAbaLinha())
  const [editingLinhaId, setEditingLinhaId] = useState<string | null>(null)
  const linhaSnapshotRef = useRef<ImhAbaLinha | null>(null)
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
    const parsed = normalizeImhAbaForm(parseImhAbaFromGrid(sheet.rows))
    const hasHeader = Boolean(parsed.clinica || parsed.numeroCp)
    const hasLinhas = parsed.linhas.length > 0
    if (!hasHeader && !hasLinhas) {
      setImportFeedback({
        open: true,
        severity: 'error',
        message:
          'Não foi possível identificar dados IMH nessa aba. Verifique se o layout é o da planilha IMH.',
      })
      return
    }
    onChange(mergeImhImport(value, parsed))
    setImportFeedback({
      open: true,
      severity: 'success',
      message: `Planilha importada${sheet.nome ? ` (aba “${sheet.nome}”)` : ''}: ${parsed.linhas.length} lançamento(s).`,
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
      const sheets = await loadImhSheetsFromFile(file)
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
      const preferred = findImhSheetIndex(sheets)
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

  const setHeaderField = <K extends 'clinica' | 'numeroCp'>(
    key: K,
    fieldValue: ImhAbaFormData[K],
  ) => {
    onChange({ ...value, [key]: fieldValue })
  }

  const persistLinhas = (linhas: ImhAbaLinha[]) => {
    onChange({
      ...value,
      linhas: linhas.map(withRecalculatedImhLinha).filter((l) => linhaHasContent(l)),
    })
  }

  const syncDraftToList = (nextDraft: ImhAbaLinha) => {
    const ready = withRecalculatedImhLinha(nextDraft)
    setLinhaDraft(ready)
    if (!editingLinhaId) return
    persistLinhas(
      value.linhas.map((l) => (l.id === editingLinhaId ? { ...ready, id: editingLinhaId } : l)),
    )
  }

  const updateDraft = (patch: Partial<Omit<ImhAbaLinha, 'id' | 'valorTotal'>>) => {
    syncDraftToList(withRecalculatedImhLinha({ ...linhaDraft, ...patch }))
  }

  const resetLinhaForm = () => {
    setLinhaDraft(createEmptyImhAbaLinha())
    setEditingLinhaId(null)
    linhaSnapshotRef.current = null
  }

  const handleAdicionarLinha = () => {
    const ready = withRecalculatedImhLinha(linhaDraft)
    if (editingLinhaId) {
      persistLinhas(
        value.linhas.map((l) =>
          l.id === editingLinhaId ? { ...ready, id: editingLinhaId } : l,
        ),
      )
      resetLinhaForm()
      return
    }
    if (!linhaHasContent(ready)) {
      resetLinhaForm()
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
            Entrada — IMH
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            Cabeçalho (Clínica / Nº CP) e lançamentos. A planilha segue o modelo da aba IMH e
            atualiza ao vivo.
          </Typography>
        </Box>

        <Box>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem', lineHeight: 1.2 }}
          >
            Cabeçalho
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
              label="Clínica"
              value={value.clinica}
              onChange={(e) => setHeaderField('clinica', formatImhUppercase(e.target.value))}
              placeholder="CLÍNICA DE TRAUMATO-ORTOPEDIA"
              size="small"
              fullWidth
              sx={{ ...compactFieldSx, gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              label="Nº CP (ANEXO)"
              value={value.numeroCp}
              onChange={(e) => setHeaderField('numeroCp', formatImhNumeroCp(e.target.value))}
              placeholder="25/2026"
              size="small"
              fullWidth
              sx={{ ...compactFieldSx, gridColumn: { sm: '1 / -1' } }}
            />
          </Box>
        </Box>

        <Box ref={linhaFormRef}>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem', lineHeight: 1.2 }}
          >
            {editingLinhaId ? 'Editando lançamento' : 'Novo lançamento'}
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
              label="DATA"
              value={linhaDraft.data}
              onChange={(e) => updateDraft({ data: formatImhData(e.target.value) })}
              placeholder="dd/mm/aa"
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="NIP"
              value={linhaDraft.nip}
              onChange={(e) => updateDraft({ nip: formatImhNip(e.target.value) })}
              placeholder="00.0000.00"
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="NOME DO USUÁRIO"
              value={linhaDraft.nomeUsuario}
              onChange={(e) => updateDraft({ nomeUsuario: formatImhUppercase(e.target.value) })}
              size="small"
              fullWidth
              sx={{ ...compactFieldSx, gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              select
              label="VÍNCULO"
              value={linhaDraft.vinculo || ''}
              onChange={(e) => updateDraft({ vinculo: formatImhUppercase(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            >
              <MenuItem value="">—</MenuItem>
              {VINCULOS.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="NIP DO TITULAR"
              value={linhaDraft.nipTitular}
              onChange={(e) => updateDraft({ nipTitular: formatImhNip(e.target.value) })}
              placeholder="00.0000.00"
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="DESCRIÇÃO DO PROCEDIMENTO/MEDICAMENTO"
              value={linhaDraft.descricao}
              onChange={(e) => updateDraft({ descricao: formatImhUppercase(e.target.value) })}
              size="small"
              fullWidth
              multiline
              minRows={2}
              sx={multilineFieldSx}
            />
            <TextField
              label="VALOR UNIT"
              value={linhaDraft.valorUnit}
              onChange={(e) => updateDraft({ valorUnit: formatImhMoeda(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="QUANTI."
              value={linhaDraft.quantidade}
              onChange={(e) => updateDraft({ quantidade: formatImhQuantidade(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="VALOR TOTAL"
              value={linhaDraft.valorTotal}
              size="small"
              fullWidth
              slotProps={{ input: { readOnly: true } }}
              sx={compactFieldSx}
            />
            <TextField
              label="% A INDENIZAR"
              value={linhaDraft.pctIndenizar}
              onChange={(e) => updateDraft({ pctIndenizar: e.target.value })}
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
              {editingLinhaId ? 'Salvar lançamento' : 'Adicionar lançamento'}
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
        <ImhAbaPlanilhaPreview
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
