import { useRef, useState } from 'react'
import { Alert, Box, MenuItem, Snackbar, TextField } from '@mui/material'
import type { ImhAbaFormData, ImhAbaLinha } from '@/types'
import { ConmedEscolherAbaModal } from '@/components/clinica/ConmedEscolherAbaModal'
import { ImhAbaPlanilhaPreview } from '@/components/clinica/ImhAbaPlanilhaPreview'
import {
  PlanilhaEditSection,
  PlanilhaLinhaEditDialog,
  planilhaEditFieldSx,
  planilhaEditMultilineSx,
} from '@/components/clinica/PlanilhaLinhaEditDialog'
import {
  createEmptyImhAbaLinha,
  formatImhData,
  formatImhMoeda,
  formatImhNip,
  formatImhNumeroCp,
  formatImhQuantidade,
  formatImhUppercase,
  isVinculoTitular,
  linhaHasContent,
  normalizeImhAbaForm,
  withRecalculatedImhLinha,
  sortImhLinhasByData,
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
  selectedImhIds?: Set<string>
  onSelectedImhIdsChange?: (next: Set<string>) => void
  /** Oculta o import local (quando há Importar Planilha na barra de abas). */
  hideImport?: boolean
  onRequestClear?: () => void
  dataFiltro: import('@/utils/planilhaDataFiltro').PlanilhaDataFiltro
  onDataFiltroChange: (next: import('@/utils/planilhaDataFiltro').PlanilhaDataFiltro) => void
}

const VINCULOS = ['TITULAR', 'DEPENDENTE DIRETO', 'DEPENDENTE INDIRETO', 'OUTROS'] as const

function cloneLinha(linha: ImhAbaLinha): ImhAbaLinha {
  return { ...linha }
}

export function ImhAbaForm({
  value,
  onChange,
  selectedImhIds,
  onSelectedImhIdsChange,
  hideImport = false,
  onRequestClear,
  dataFiltro,
  onDataFiltroChange,
}: ImhAbaFormProps) {
  const [linhaDraft, setLinhaDraft] = useState<ImhAbaLinha>(() => createEmptyImhAbaLinha())
  const [editingLinhaId, setEditingLinhaId] = useState<string | null>(null)
  const [sheetExpanded, setSheetExpanded] = useState(false)
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
      linhas: sortImhLinhasByData(
        linhas.map(withRecalculatedImhLinha).filter((l) => linhaHasContent(l)),
      ),
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
    if (!sheetExpanded) {
      requestAnimationFrame(() => {
        linhaFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
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
        selectedImhIds={selectedImhIds}
        onSelectedImhIdsChange={onSelectedImhIdsChange}
        onImportClick={hideImport ? undefined : handleImportClick}
        onEditLinha={handleEditLinha}
        onDeleteLinha={handleDeleteLinha}
        onRequestClear={onRequestClear}
        dataFiltro={dataFiltro}
        onDataFiltroChange={onDataFiltroChange}
        onExpandedChange={setSheetExpanded}
      />

      <PlanilhaLinhaEditDialog
        open={Boolean(editingLinhaId)}
        title="Editar IMH"
        badge="IMH"
        onClose={handleCancelLinha}
        onSave={handleAdicionarLinha}
        anchorLinhaId={editingLinhaId}
      >
        <Box ref={linhaFormRef} sx={{ display: 'grid', gap: 1.25 }}>
          <PlanilhaEditSection title="Cabeçalho" columns={2}>
            <TextField
              label="Clínica"
              value={value.clinica}
              onChange={(e) => setHeaderField('clinica', formatImhUppercase(e.target.value))}
              placeholder="CLÍNICA DE TRAUMATO-ORTOPEDIA"
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="Nº CP (ANEXO)"
              value={value.numeroCp}
              onChange={(e) => setHeaderField('numeroCp', formatImhNumeroCp(e.target.value))}
              placeholder="25/2026"
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
          </PlanilhaEditSection>

          <PlanilhaEditSection title="Beneficiário" columns={3}>
            <TextField
              label="DATA"
              value={linhaDraft.data}
              onChange={(e) => updateDraft({ data: formatImhData(e.target.value) })}
              placeholder="dd/mm/aa"
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="NIP"
              value={linhaDraft.nip}
              onChange={(e) => updateDraft({ nip: formatImhNip(e.target.value) })}
              placeholder="00.0000.00"
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              select
              label="VÍNCULO"
              value={linhaDraft.vinculo || ''}
              onChange={(e) => {
                const vinculo = formatImhUppercase(e.target.value)
                updateDraft(
                  isVinculoTitular(vinculo) ? { vinculo } : { vinculo, nipTitular: '' },
                )
              }}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            >
              <MenuItem value="">—</MenuItem>
              {VINCULOS.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="NOME DO USUÁRIO"
              value={linhaDraft.nomeUsuario}
              onChange={(e) => updateDraft({ nomeUsuario: formatImhUppercase(e.target.value) })}
              size="small"
              fullWidth
              sx={{ ...planilhaEditFieldSx, gridColumn: { sm: 'span 2' } }}
            />
            <TextField
              label="NIP DO TITULAR"
              value={
                isVinculoTitular(linhaDraft.vinculo) ? linhaDraft.nip : linhaDraft.nipTitular
              }
              onChange={(e) => updateDraft({ nipTitular: formatImhNip(e.target.value) })}
              placeholder="00.0000.00"
              size="small"
              fullWidth
              slotProps={{
                input: { readOnly: isVinculoTitular(linhaDraft.vinculo) },
              }}
              title={
                isVinculoTitular(linhaDraft.vinculo)
                  ? 'Igual ao NIP quando o vínculo é TITULAR'
                  : linhaDraft.vinculo
                    ? 'Preencha manualmente o NIP do titular'
                    : undefined
              }
              sx={planilhaEditFieldSx}
            />
          </PlanilhaEditSection>

          <PlanilhaEditSection title="Procedimento e valores" columns={4}>
            <TextField
              label="DESCRIÇÃO DO PROCEDIMENTO/MEDICAMENTO"
              value={linhaDraft.descricao}
              onChange={(e) => updateDraft({ descricao: formatImhUppercase(e.target.value) })}
              size="small"
              fullWidth
              multiline
              minRows={1}
              maxRows={2}
              sx={planilhaEditMultilineSx}
            />
            <TextField
              label="VALOR UNIT"
              value={linhaDraft.valorUnit}
              onChange={(e) => updateDraft({ valorUnit: formatImhMoeda(e.target.value) })}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="QUANTI."
              value={linhaDraft.quantidade}
              onChange={(e) => updateDraft({ quantidade: formatImhQuantidade(e.target.value) })}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="VALOR TOTAL"
              value={linhaDraft.valorTotal}
              size="small"
              fullWidth
              slotProps={{ input: { readOnly: true } }}
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="% A INDENIZAR"
              value={linhaDraft.pctIndenizar}
              size="small"
              fullWidth
              slotProps={{ input: { readOnly: true } }}
              sx={planilhaEditFieldSx}
            />
          </PlanilhaEditSection>
        </Box>
      </PlanilhaLinhaEditDialog>

      {!hideImport ? (
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
      ) : null}
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
  )
}
