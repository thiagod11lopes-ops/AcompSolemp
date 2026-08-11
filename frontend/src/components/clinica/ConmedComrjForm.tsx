import { useRef, useState } from 'react'
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
import type {
  ConmedComrjFormData,
  ConmedComrjMaterialItem,
  ConmedComrjPaciente,
} from '@/types'
import { ConmedComrjPlanilhaPreview } from '@/components/clinica/ConmedComrjPlanilhaPreview'
import { ConmedEscolherAbaModal } from '@/components/clinica/ConmedEscolherAbaModal'
import {
  createEmptyConmedMaterialItem,
  createEmptyConmedPaciente,
  formatConmedData,
  formatConmedMoeda,
  formatConmedNebPi,
  formatConmedNumero,
  formatConmedNumerico,
  formatConmedPacienteNip,
  formatConmedPregaoTad,
  formatConmedProcesso,
  formatConmedQuantidade,
  formatConmedUppercase,
  materialHasContent,
  normalizeConmedComrjForm,
  pacienteHasContent,
  withRecalculatedMaterialTotal,
  withRecalculatedPaciente,
} from '@/utils/conmedComrjForm'
import {
  loadConmedSheetsFromFile,
  mergeConmedImport,
  parseConmedComrjFromGrid,
} from '@/utils/conmedComrjImport'
import type { SpreadsheetSheetImport } from '@/utils/consumoMaterialOds'

interface ConmedComrjFormProps {
  value: ConmedComrjFormData
  onChange: (next: ConmedComrjFormData) => void
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

function clonePaciente(p: ConmedComrjPaciente): ConmedComrjPaciente {
  return {
    ...p,
    materiais: p.materiais.map((m) => ({ ...m })),
  }
}

function cloneMaterial(item: ConmedComrjMaterialItem): ConmedComrjMaterialItem {
  return { ...item }
}

export function ConmedComrjForm({ value, onChange }: ConmedComrjFormProps) {
  const [patientDraft, setPatientDraft] = useState<ConmedComrjPaciente>(() =>
    createEmptyConmedPaciente(),
  )
  const [editingPacienteId, setEditingPacienteId] = useState<string | null>(null)
  const patientSnapshotRef = useRef<ConmedComrjPaciente | null>(null)
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

  const applyImportedSheet = (sheet: SpreadsheetSheetImport) => {
    const parsed = normalizeConmedComrjForm(parseConmedComrjFromGrid(sheet.rows))
    const hasProcess =
      Boolean(parsed.numero || parsed.data || parsed.processo || parsed.pregaoTad || parsed.vigencia || parsed.fornecedor)
    const hasPatients = parsed.pacientes.length > 0
    if (!hasProcess && !hasPatients) {
      setImportFeedback({
        open: true,
        severity: 'error',
        message:
          'Não foi possível identificar dados CONMED nessa aba. Verifique se o layout é o da planilha do sistema.',
      })
      return
    }
    onChange(mergeConmedImport(value, parsed))
    setImportFeedback({
      open: true,
      severity: 'success',
      message: `Planilha importada${sheet.nome ? ` (aba “${sheet.nome}”)` : ''}: ${parsed.pacientes.length} paciente(s).`,
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
      const sheets = await loadConmedSheetsFromFile(file)
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

  const [materialDraft, setMaterialDraft] = useState<ConmedComrjMaterialItem>(() =>
    createEmptyConmedMaterialItem(),
  )
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null)
  const materialSnapshotRef = useRef<ConmedComrjMaterialItem | null>(null)
  const patientFormRef = useRef<HTMLDivElement | null>(null)
  const materialFormRef = useRef<HTMLDivElement | null>(null)

  const setField = <K extends keyof ConmedComrjFormData>(
    key: K,
    fieldValue: ConmedComrjFormData[K],
  ) => {
    onChange({ ...value, [key]: fieldValue })
  }

  const persistPacientes = (pacientes: ConmedComrjPaciente[]) => {
    onChange({
      ...value,
      pacientes: pacientes.map(withRecalculatedPaciente),
    })
  }

  const syncPatientDraftToList = (nextDraft: ConmedComrjPaciente) => {
    const ready = withRecalculatedPaciente(nextDraft)
    setPatientDraft(ready)
    if (!editingPacienteId) return
    persistPacientes(
      value.pacientes.map((p) => (p.id === editingPacienteId ? { ...ready, id: editingPacienteId } : p)),
    )
  }

  const updatePatientDraft = (
    patch: Partial<Omit<ConmedComrjPaciente, 'id' | 'materiais' | 'valorPorPaciente'>>,
  ) => {
    syncPatientDraftToList({ ...patientDraft, ...patch })
  }

  const resetPatientForm = () => {
    setPatientDraft(createEmptyConmedPaciente())
    setEditingPacienteId(null)
    patientSnapshotRef.current = null
    setMaterialDraft(createEmptyConmedMaterialItem())
    setEditingMaterialId(null)
    materialSnapshotRef.current = null
  }

  const handleAdicionarPaciente = () => {
    const ready = withRecalculatedPaciente(patientDraft)
    if (editingPacienteId) {
      persistPacientes(
        value.pacientes.map((p) =>
          p.id === editingPacienteId ? { ...ready, id: editingPacienteId } : p,
        ),
      )
      resetPatientForm()
      return
    }
    if (!pacienteHasContent(ready)) {
      resetPatientForm()
      return
    }
    persistPacientes([...value.pacientes, ready])
    resetPatientForm()
  }

  const handleEditPaciente = (id: string) => {
    const found = value.pacientes.find((p) => p.id === id)
    if (!found) return
    patientSnapshotRef.current = clonePaciente(found)
    setEditingPacienteId(id)
    setPatientDraft(clonePaciente(found))
    setMaterialDraft(createEmptyConmedMaterialItem())
    setEditingMaterialId(null)
    materialSnapshotRef.current = null
    requestAnimationFrame(() => {
      patientFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const handleDeletePaciente = (id: string) => {
    persistPacientes(value.pacientes.filter((p) => p.id !== id))
    if (editingPacienteId === id) resetPatientForm()
  }

  const handleCancelPaciente = () => {
    if (editingPacienteId && patientSnapshotRef.current) {
      persistPacientes(
        value.pacientes.map((p) =>
          p.id === editingPacienteId ? clonePaciente(patientSnapshotRef.current!) : p,
        ),
      )
    }
    resetPatientForm()
  }

  const applyMateriaisToPatientDraft = (materiais: ConmedComrjMaterialItem[]) => {
    syncPatientDraftToList(withRecalculatedPaciente({ ...patientDraft, materiais }))
  }

  const updateMaterialDraft = (
    patch: Partial<Omit<ConmedComrjMaterialItem, 'id' | 'valorTotal'>>,
  ) => {
    const next = withRecalculatedMaterialTotal({ ...materialDraft, ...patch })
    setMaterialDraft(next)
    if (editingMaterialId) {
      const materiais = patientDraft.materiais.map((item) =>
        item.id === editingMaterialId ? { ...next, id: editingMaterialId } : item,
      )
      applyMateriaisToPatientDraft(materiais)
    }
  }

  const resetMaterialForm = () => {
    setMaterialDraft(createEmptyConmedMaterialItem())
    setEditingMaterialId(null)
    materialSnapshotRef.current = null
  }

  const handleAdicionarMaterial = () => {
    const ready = withRecalculatedMaterialTotal(materialDraft)
    if (editingMaterialId) {
      const materiais = patientDraft.materiais.map((item) =>
        item.id === editingMaterialId ? { ...ready, id: editingMaterialId } : item,
      )
      applyMateriaisToPatientDraft(materiais)
      resetMaterialForm()
      return
    }
    if (!materialHasContent(ready)) {
      resetMaterialForm()
      return
    }
    applyMateriaisToPatientDraft([...patientDraft.materiais, ready])
    resetMaterialForm()
  }

  const handleEditMaterial = (pacienteId: string, materialId: string) => {
    const paciente = value.pacientes.find((p) => p.id === pacienteId)
    const mat = paciente?.materiais.find((m) => m.id === materialId)
    if (!paciente || !mat) return

    if (editingPacienteId !== pacienteId) {
      patientSnapshotRef.current = clonePaciente(paciente)
      setEditingPacienteId(pacienteId)
      setPatientDraft(clonePaciente(paciente))
    }

    materialSnapshotRef.current = cloneMaterial(mat)
    setEditingMaterialId(materialId)
    setMaterialDraft(cloneMaterial(mat))
    requestAnimationFrame(() => {
      materialFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const handleDeleteMaterial = (pacienteId: string, materialId: string) => {
    if (editingPacienteId === pacienteId) {
      applyMateriaisToPatientDraft(patientDraft.materiais.filter((m) => m.id !== materialId))
      if (editingMaterialId === materialId) resetMaterialForm()
      return
    }
    persistPacientes(
      value.pacientes.map((p) =>
        p.id === pacienteId
          ? withRecalculatedPaciente({
              ...p,
              materiais: p.materiais.filter((m) => m.id !== materialId),
            })
          : p,
      ),
    )
  }

  const handleCancelMaterial = () => {
    if (editingMaterialId && materialSnapshotRef.current) {
      applyMateriaisToPatientDraft(
        patientDraft.materiais.map((item) =>
          item.id === editingMaterialId ? cloneMaterial(materialSnapshotRef.current!) : item,
        ),
      )
    }
    resetMaterialForm()
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
            Entrada — CONMED COMRJ
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            Adicione pacientes e, em cada um, os materiais utilizados. A planilha atualiza ao vivo.
          </Typography>
        </Box>

        <Box>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem', lineHeight: 1.2 }}
          >
            Dados do processo
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
              label="Nº"
              value={value.numero}
              onChange={(e) => setField('numero', formatConmedNumero(e.target.value))}
              placeholder="25/2026"
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="DATA"
              value={value.data}
              onChange={(e) => setField('data', formatConmedData(e.target.value))}
              placeholder="dd/mm/aaaa"
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="PROCESSO"
              value={value.processo}
              onChange={(e) => setField('processo', formatConmedProcesso(e.target.value))}
              size="small"
              fullWidth
              inputMode="numeric"
              sx={compactFieldSx}
            />
            <TextField
              label="Pregão/TAD"
              value={value.pregaoTad}
              onChange={(e) => setField('pregaoTad', formatConmedPregaoTad(e.target.value))}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="Vigência"
              value={value.vigencia}
              onChange={(e) => setField('vigencia', e.target.value)}
              size="small"
              fullWidth
              sx={{ ...compactFieldSx, gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              label="FORNECEDOR"
              value={value.fornecedor}
              onChange={(e) => setField('fornecedor', e.target.value)}
              size="small"
              fullWidth
              sx={{ ...compactFieldSx, gridColumn: { sm: '1 / -1' } }}
            />
          </Box>
        </Box>

        <Box ref={patientFormRef}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mb: 0.5,
              flexWrap: 'wrap',
            }}
          >
            <Typography
              variant="overline"
              sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem', lineHeight: 1.2 }}
            >
              Dados do paciente
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {editingPacienteId ? (
                <Button
                  size="small"
                  variant="text"
                  onClick={handleCancelPaciente}
                  sx={{ fontSize: '0.72rem', py: 0.25, px: 1, minHeight: 28 }}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={handleAdicionarPaciente}
                sx={{ fontSize: '0.72rem', py: 0.25, px: 1, minHeight: 28 }}
              >
                {editingPacienteId ? 'Salvar paciente' : 'Adicionar paciente'}
              </Button>
            </Box>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.75, fontSize: '0.68rem' }}
          >
            {editingPacienteId
              ? 'Editando paciente. Materiais abaixo ficam vinculados a este paciente.'
              : 'Preencha o paciente (e materiais) e clique em Adicionar. O formulário limpa para o próximo.'}
          </Typography>

          <Paper
            variant="outlined"
            key={editingPacienteId ?? `new-${patientDraft.id}`}
            sx={{ p: 1, display: 'grid', gap: 0.75, bgcolor: 'background.paper' }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
              {editingPacienteId
                ? `Editando paciente ${
                    value.pacientes.findIndex((p) => p.id === editingPacienteId) + 1
                  }`
                : 'Novo paciente'}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 0.75,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              }}
            >
              <TextField
                label="NIP"
                value={patientDraft.nip}
                onChange={(e) =>
                  updatePatientDraft({ nip: formatConmedPacienteNip(e.target.value) })
                }
                placeholder="00.0000.00"
                size="small"
                fullWidth
                inputMode="numeric"
                sx={compactFieldSx}
              />
              <TextField
                label="INICIAIS"
                value={patientDraft.iniciais}
                onChange={(e) =>
                  updatePatientDraft({ iniciais: formatConmedUppercase(e.target.value) })
                }
                size="small"
                fullWidth
                sx={compactFieldSx}
                slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
              />
              <TextField
                label="Data"
                value={patientDraft.data}
                onChange={(e) => updatePatientDraft({ data: formatConmedData(e.target.value) })}
                placeholder="dd/mm/aaaa"
                size="small"
                fullWidth
                sx={{ ...compactFieldSx, gridColumn: { sm: '1 / -1' } }}
              />
              <TextField
                label="PROCEDIMENTO"
                value={patientDraft.procedimento}
                onChange={(e) =>
                  updatePatientDraft({ procedimento: formatConmedUppercase(e.target.value) })
                }
                size="small"
                fullWidth
                multiline
                minRows={3}
                maxRows={8}
                sx={multilineFieldSx}
                slotProps={{
                  htmlInput: { style: { textTransform: 'uppercase', resize: 'vertical' } },
                }}
              />
            </Box>
          </Paper>
        </Box>

        <Box ref={materialFormRef}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mb: 0.5,
              flexWrap: 'wrap',
            }}
          >
            <Typography
              variant="overline"
              sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem', lineHeight: 1.2 }}
            >
              Materiais do paciente
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {editingMaterialId ? (
                <Button
                  size="small"
                  variant="text"
                  onClick={handleCancelMaterial}
                  sx={{ fontSize: '0.72rem', py: 0.25, px: 1, minHeight: 28 }}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={handleAdicionarMaterial}
                sx={{ fontSize: '0.72rem', py: 0.25, px: 1, minHeight: 28 }}
              >
                {editingMaterialId ? 'Salvar material' : 'Adicionar material'}
              </Button>
            </Box>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.75, fontSize: '0.68rem' }}
          >
            Materiais vão para o paciente do formulário acima
            {patientDraft.materiais.length
              ? ` (${patientDraft.materiais.length} na lista atual)`
              : ''}
            .
          </Typography>

          <Paper
            variant="outlined"
            key={editingMaterialId ?? materialDraft.id}
            sx={{ p: 1, display: 'grid', gap: 0.75, bgcolor: 'background.paper' }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
              {editingMaterialId ? 'Editando material' : 'Novo material'}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 0.75,
                gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr' },
              }}
            >
              <TextField
                label="MAPA DA SALA"
                value={materialDraft.mapaDaSala}
                onChange={(e) =>
                  updateMaterialDraft({ mapaDaSala: formatConmedNumerico(e.target.value) })
                }
                size="small"
                fullWidth
                inputMode="numeric"
                sx={compactFieldSx}
              />
              <TextField
                label="DANFE"
                value={materialDraft.danfe}
                onChange={(e) =>
                  updateMaterialDraft({ danfe: formatConmedNumerico(e.target.value) })
                }
                size="small"
                fullWidth
                inputMode="numeric"
                sx={compactFieldSx}
              />
              <TextField
                label="ITEM"
                value={materialDraft.item}
                onChange={(e) =>
                  updateMaterialDraft({ item: formatConmedNumerico(e.target.value) })
                }
                size="small"
                fullWidth
                inputMode="numeric"
                sx={compactFieldSx}
              />
              <TextField
                label="NEB/PI"
                value={materialDraft.nebPi}
                onChange={(e) => updateMaterialDraft({ nebPi: formatConmedNebPi(e.target.value) })}
                size="small"
                fullWidth
                sx={compactFieldSx}
                slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
              />
              <TextField
                label="DESCRIÇÃO DO MATERIAL"
                value={materialDraft.descricao}
                onChange={(e) =>
                  updateMaterialDraft({ descricao: formatConmedUppercase(e.target.value) })
                }
                size="small"
                fullWidth
                multiline
                minRows={3}
                maxRows={8}
                sx={multilineFieldSx}
                slotProps={{
                  htmlInput: { style: { textTransform: 'uppercase', resize: 'vertical' } },
                }}
              />
              <TextField
                label="QT"
                value={materialDraft.qt}
                onChange={(e) =>
                  updateMaterialDraft({ qt: formatConmedQuantidade(e.target.value) })
                }
                size="small"
                fullWidth
                inputMode="decimal"
                sx={compactFieldSx}
              />
              <TextField
                label="VALOR UNIT"
                value={materialDraft.valorUnit}
                onChange={(e) =>
                  updateMaterialDraft({ valorUnit: formatConmedMoeda(e.target.value) })
                }
                placeholder="R$ 0,00"
                size="small"
                fullWidth
                inputMode="numeric"
                sx={compactFieldSx}
              />
              <TextField
                label="VALOR TOTAL"
                value={materialDraft.valorTotal}
                size="small"
                fullWidth
                slotProps={{ input: { readOnly: true } }}
                sx={{ ...compactFieldSx, gridColumn: '1 / -1' }}
              />
            </Box>
          </Paper>
        </Box>
      </Paper>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, mb: 1, color: 'text.secondary', fontSize: '0.8rem' }}
        >
          Planilha do processo (ao vivo)
        </Typography>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet"
          hidden
          onChange={handleImportFileChange}
        />
        <ConmedComrjPlanilhaPreview
          value={value}
          editingPacienteId={editingPacienteId}
          editingMaterialId={editingMaterialId}
          importing={importing}
          onImportClick={handleImportClick}
          onEditPaciente={handleEditPaciente}
          onDeletePaciente={handleDeletePaciente}
          onEditMaterial={handleEditMaterial}
          onDeleteMaterial={handleDeleteMaterial}
        />
        <ConmedEscolherAbaModal
          open={sheetPicker.open}
          sheetNames={sheetPicker.sheets.map((s) => s.nome)}
          fileName={sheetPicker.fileName}
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
