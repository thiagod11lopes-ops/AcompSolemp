import { useEffect, useMemo, useRef, useState } from 'react'
import { Add as AddIcon } from '@mui/icons-material'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import type { ImhMedicamentoFormData, ImhMedicamentoLinha } from '@/types'
import { ConmedEscolherAbaModal } from '@/components/clinica/ConmedEscolherAbaModal'
import { ImhMedicamentoPlanilhaPreview } from '@/components/clinica/ImhMedicamentoPlanilhaPreview'
import {
  createEmptyImhMedicamentoLinha,
  formatImhMedData,
  formatImhMedMoeda,
  formatImhMedNip,
  formatImhMedQtd,
  formatImhMedUppercase,
  linhaImhMedicamentoHasContent,
  normalizeImhMedicamentoForm,
  withRecalculatedImhMedicamentoLinha,
} from '@/utils/imhMedicamentoForm'
import {
  findImhMedicamentoSheetIndex,
  loadImhMedicamentoSheetsFromFile,
  mergeImhMedicamentoImport,
  parseImhMedicamentoFromGrid,
} from '@/utils/imhMedicamentoImport'
import type { SpreadsheetSheetImport } from '@/utils/consumoMaterialOds'
import {
  findMedicamentoPrecoByNome,
  formatPrecoReferenciaMedicamento,
  getMedicamentosPrecosCatalog,
  type MedicamentoPrecoRow,
} from '@/utils/medicamentosPrecos'
import {
  findPacientePmeByNip,
  findPacientePmeByNome,
  formatPacientePmeUpper,
  normalizePacienteNipKey,
  searchPacientesPmeByNome,
  type PacientePmeRow,
} from '@/utils/pacientesPme'

interface ImhMedicamentoFormProps {
  value: ImhMedicamentoFormData
  onChange: (next: ImhMedicamentoFormData) => void
  pacientes?: PacientePmeRow[]
}

const VINCULOS = ['TITULAR', 'DEPENDENTE', 'OUTRO'] as const
const NIP_NAO_CADASTRADO = 'NIP NÃO CADASTRADO NO SISTEMA'

function mapVinculoPaciente(raw: string): string {
  const upper = formatPacientePmeUpper(raw)
  if (!upper) return ''
  if (VINCULOS.includes(upper as (typeof VINCULOS)[number])) return upper
  if (upper.includes('DEPENDENTE') && !upper.includes('TITULAR')) return 'DEPENDENTE'
  if (upper.includes('TITULAR') && !upper.includes('DEPENDENTE')) return 'TITULAR'
  return upper
}

function pacienteToDraftPatch(
  paciente: PacientePmeRow,
): Partial<Omit<ImhMedicamentoLinha, 'id' | 'total'>> {
  return {
    nip: formatImhMedNip(paciente.nipUsuario),
    nome: formatImhMedUppercase(paciente.nome),
    nipTitular: formatImhMedNip(paciente.nipTitular || paciente.nipUsuario),
    postoGrad: formatImhMedUppercase(paciente.postoGradTitular),
    vinculo: mapVinculoPaciente(paciente.vinculo),
  }
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

function cloneLinha(linha: ImhMedicamentoLinha): ImhMedicamentoLinha {
  return { ...linha }
}

export function ImhMedicamentoForm({
  value,
  onChange,
  pacientes = [],
}: ImhMedicamentoFormProps) {
  const catalog = useMemo(() => getMedicamentosPrecosCatalog(), [])
  const [linhaDraft, setLinhaDraft] = useState<ImhMedicamentoLinha>(() =>
    createEmptyImhMedicamentoLinha(),
  )
  const [itemPmeInput, setItemPmeInput] = useState('')
  const [nomeInput, setNomeInput] = useState('')
  const [editingLinhaId, setEditingLinhaId] = useState<string | null>(null)
  const linhaSnapshotRef = useRef<ImhMedicamentoLinha | null>(null)
  const linhaFormRef = useRef<HTMLDivElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const nipAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [nipNaoCadastrado, setNipNaoCadastrado] = useState(false)
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

  useEffect(
    () => () => {
      if (nipAlertTimerRef.current) clearTimeout(nipAlertTimerRef.current)
    },
    [],
  )

  const showNipNaoCadastrado = () => {
    setNipNaoCadastrado(true)
    if (nipAlertTimerRef.current) clearTimeout(nipAlertTimerRef.current)
    nipAlertTimerRef.current = setTimeout(() => {
      setNipNaoCadastrado(false)
      nipAlertTimerRef.current = null
    }, 5000)
  }

  const vinculoOptions = useMemo(() => {
    const set = new Set<string>([...VINCULOS])
    if (linhaDraft.vinculo.trim()) set.add(linhaDraft.vinculo.trim())
    return [...set]
  }, [linhaDraft.vinculo])

  const selectedPacienteNome = findPacientePmeByNome(linhaDraft.nome, pacientes) ?? null

  const applyImportedSheet = (sheet: SpreadsheetSheetImport) => {
    const parsed = normalizeImhMedicamentoForm(parseImhMedicamentoFromGrid(sheet.rows))
    if (parsed.linhas.length === 0) {
      setImportFeedback({
        open: true,
        severity: 'error',
        message:
          'Não foi possível identificar dados do Modelo IHM — PME nessa aba. Verifique o layout.',
      })
      return
    }
    onChange(mergeImhMedicamentoImport(value, parsed))
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
      const sheets = await loadImhMedicamentoSheetsFromFile(file)
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
      const preferred = findImhMedicamentoSheetIndex(sheets)
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

  const persistLinhas = (linhas: ImhMedicamentoLinha[]) => {
    onChange({
      linhas: linhas
        .map(withRecalculatedImhMedicamentoLinha)
        .filter((l) => linhaImhMedicamentoHasContent(l)),
    })
  }

  const syncDraftToList = (nextDraft: ImhMedicamentoLinha) => {
    const ready = withRecalculatedImhMedicamentoLinha(nextDraft)
    setLinhaDraft(ready)
    setNomeInput(ready.nome)
    if (!editingLinhaId) return
    persistLinhas(
      value.linhas.map((l) => (l.id === editingLinhaId ? { ...ready, id: editingLinhaId } : l)),
    )
  }

  const updateDraft = (patch: Partial<Omit<ImhMedicamentoLinha, 'id' | 'total'>>) => {
    syncDraftToList(withRecalculatedImhMedicamentoLinha({ ...linhaDraft, ...patch }))
  }

  const applyPacienteSelection = (paciente: PacientePmeRow | null) => {
    if (!paciente) return
    setNipNaoCadastrado(false)
    if (nipAlertTimerRef.current) {
      clearTimeout(nipAlertTimerRef.current)
      nipAlertTimerRef.current = null
    }
    syncDraftToList(
      withRecalculatedImhMedicamentoLinha({
        ...linhaDraft,
        ...pacienteToDraftPatch(paciente),
      }),
    )
  }

  const tryFillFromNip = (nipRaw: string, { alertIfMissing }: { alertIfMissing: boolean }) => {
    const digits = normalizePacienteNipKey(nipRaw)
    if (!digits) return
    const found = findPacientePmeByNip(nipRaw, pacientes)
    if (found) {
      applyPacienteSelection(found)
      return
    }
    if (alertIfMissing && digits.length >= 6) {
      showNipNaoCadastrado()
    }
  }

  const tryFillFromNome = (nomeRaw: string) => {
    const found = findPacientePmeByNome(nomeRaw, pacientes)
    if (found) applyPacienteSelection(found)
  }

  const applyMedicamentoSelection = (row: MedicamentoPrecoRow | null) => {
    if (!row) {
      updateDraft({ itemPme: '' })
      setItemPmeInput('')
      return
    }
    const unitario = formatPrecoReferenciaMedicamento(row.precoReferencia)
    updateDraft({
      itemPme: formatImhMedUppercase(row.medicamento),
      valorUnitario: unitario,
      unidadeFornecimento:
        linhaDraft.unidadeFornecimento.trim() || formatImhMedUppercase(row.uf),
      qtd: linhaDraft.qtd.trim() || '1',
    })
    setItemPmeInput(row.medicamento)
  }

  const resetLinhaForm = () => {
    setLinhaDraft(createEmptyImhMedicamentoLinha())
    setItemPmeInput('')
    setNomeInput('')
    setEditingLinhaId(null)
    linhaSnapshotRef.current = null
  }

  const handleAdicionarLinha = () => {
    const ready = withRecalculatedImhMedicamentoLinha(linhaDraft)
    if (editingLinhaId) {
      persistLinhas(
        value.linhas.map((l) =>
          l.id === editingLinhaId ? { ...ready, id: editingLinhaId } : l,
        ),
      )
      resetLinhaForm()
      return
    }
    if (!linhaImhMedicamentoHasContent(ready)) {
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
    setItemPmeInput(found.itemPme)
    setNomeInput(found.nome)
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

  const selectedMedicamento =
    findMedicamentoPrecoByNome(linhaDraft.itemPme, catalog) ?? null

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', xl: 'minmax(340px, 420px) minmax(0, 1fr)' },
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
            Entrada — Modelo IHM — PME
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            Digite NIP ou nome para preencher automaticamente com a aba Pacientes. A planilha à
            direita atualiza ao vivo.
          </Typography>
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
              onChange={(e) => updateDraft({ data: formatImhMedData(e.target.value) })}
              placeholder="dd/mm/aa"
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="NIP"
              value={linhaDraft.nip}
              onChange={(e) => {
                const nip = formatImhMedNip(e.target.value)
                updateDraft({ nip })
                if (normalizePacienteNipKey(nip).length >= 8) {
                  tryFillFromNip(nip, { alertIfMissing: true })
                }
              }}
              onBlur={(e) =>
                tryFillFromNip(formatImhMedNip(e.target.value), { alertIfMissing: true })
              }
              placeholder="00.0000.00"
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <Autocomplete
              options={pacientes}
              value={selectedPacienteNome}
              inputValue={nomeInput}
              onInputChange={(_, next, reason) => {
                setNomeInput(next)
                if (reason === 'input' || reason === 'clear') {
                  updateDraft({ nome: formatImhMedUppercase(next) })
                }
              }}
              onChange={(_, option) => {
                if (typeof option === 'string') {
                  const nome = formatImhMedUppercase(option)
                  updateDraft({ nome })
                  setNomeInput(nome)
                  tryFillFromNome(nome)
                  return
                }
                if (option) applyPacienteSelection(option)
              }}
              getOptionLabel={(option) =>
                typeof option === 'string' ? option : option.nome
              }
              isOptionEqualToValue={(a, b) => {
                if (typeof a === 'string' || typeof b === 'string') {
                  return (
                    formatPacientePmeUpper(typeof a === 'string' ? a : a.nome) ===
                    formatPacientePmeUpper(typeof b === 'string' ? b : b.nome)
                  )
                }
                return a.id === b.id
              }}
              filterOptions={(options, state) =>
                searchPacientesPmeByNome(state.inputValue, options, 40)
              }
              freeSolo
              onBlur={() => tryFillFromNome(nomeInput || linhaDraft.nome)}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box sx={{ py: 0.25 }}>
                    <Typography variant="body2">{option.nome}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      NIP {option.nipUsuario}
                      {option.postoGradTitular ? ` · ${option.postoGradTitular}` : ''}
                      {option.vinculo ? ` · ${option.vinculo}` : ''}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="NOME"
                  size="small"
                  fullWidth
                  placeholder="Busque o paciente pelo nome"
                  sx={compactFieldSx}
                />
              )}
              noOptionsText="Nenhum paciente na planilha Pacientes"
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <Autocomplete
              options={catalog}
              value={selectedMedicamento}
              inputValue={itemPmeInput}
              onInputChange={(_, next) => {
                setItemPmeInput(next)
                if (!next.trim()) {
                  updateDraft({ itemPme: '' })
                }
              }}
              onChange={(_, option) => {
                if (typeof option === 'string') {
                  updateDraft({ itemPme: formatImhMedUppercase(option) })
                  setItemPmeInput(option)
                  return
                }
                applyMedicamentoSelection(option)
              }}
              getOptionLabel={(option) =>
                typeof option === 'string' ? option : option.medicamento
              }
              isOptionEqualToValue={(a, b) => {
                if (typeof a === 'string' || typeof b === 'string') {
                  return (
                    (typeof a === 'string' ? a : a.medicamento).toLowerCase() ===
                    (typeof b === 'string' ? b : b.medicamento).toLowerCase()
                  )
                }
                return a.id === b.id
              }}
              filterOptions={(options, state) => {
                const q = state.inputValue.trim().toLowerCase()
                if (!q) return options.slice(0, 40)
                return options
                  .filter(
                    (opt) =>
                      opt.medicamento.toLowerCase().includes(q) ||
                      opt.neb.toLowerCase().includes(q),
                  )
                  .slice(0, 40)
              }}
              freeSolo
              onBlur={() => {
                if (!itemPmeInput.trim()) return
                if (selectedMedicamento) return
                updateDraft({ itemPme: formatImhMedUppercase(itemPmeInput) })
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box sx={{ py: 0.25 }}>
                    <Typography variant="body2">{option.medicamento}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.neb}
                      {option.uf ? ` · ${option.uf}` : ''}
                      {option.precoReferencia
                        ? ` · ${formatPrecoReferenciaMedicamento(option.precoReferencia)}`
                        : ''}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="ITEM (PME) — DESCRIÇÃO DO MEDICAMENTO"
                  size="small"
                  fullWidth
                  placeholder="Busque pelo nome do medicamento"
                  sx={multilineFieldSx}
                />
              )}
              noOptionsText="Nenhum medicamento encontrado na lista de preços"
              sx={{ gridColumn: '1 / -1' }}
            />
            <TextField
              label="QTD"
              value={linhaDraft.qtd}
              onChange={(e) => updateDraft({ qtd: formatImhMedQtd(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="VALOR UNITÁRIO"
              value={linhaDraft.valorUnitario}
              onChange={(e) => updateDraft({ valorUnitario: formatImhMedMoeda(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="TOTAL"
              value={linhaDraft.total}
              size="small"
              fullWidth
              slotProps={{ input: { readOnly: true } }}
              sx={compactFieldSx}
            />
            <TextField
              label="NIP TITULAR"
              value={linhaDraft.nipTitular}
              onChange={(e) => updateDraft({ nipTitular: formatImhMedNip(e.target.value) })}
              placeholder="00.0000.00"
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="POSTO/GRAD"
              value={linhaDraft.postoGrad}
              onChange={(e) => updateDraft({ postoGrad: formatImhMedUppercase(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              select
              label="VINCULO"
              value={linhaDraft.vinculo || ''}
              onChange={(e) => updateDraft({ vinculo: formatImhMedUppercase(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            >
              <MenuItem value="">—</MenuItem>
              {vinculoOptions.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="% A INDENIZAR"
              value={linhaDraft.pctIndenizar}
              onChange={(e) => updateDraft({ pctIndenizar: e.target.value })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="OM"
              value={linhaDraft.om}
              onChange={(e) => updateDraft({ om: formatImhMedUppercase(e.target.value) })}
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="UNIDADE DE FORNECIMENTO"
              value={linhaDraft.unidadeFornecimento}
              onChange={(e) =>
                updateDraft({ unidadeFornecimento: formatImhMedUppercase(e.target.value) })
              }
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="QUANTIDADE ADQUIRIDA PELA OMH/OMFM"
              value={linhaDraft.quantidadeAdquirida}
              onChange={(e) =>
                updateDraft({ quantidadeAdquirida: formatImhMedQtd(e.target.value) })
              }
              size="small"
              fullWidth
              sx={compactFieldSx}
            />
            <TextField
              label="MANEIRA DE DISPENSAÇÃO"
              value={linhaDraft.maneiraDispensacao}
              onChange={(e) =>
                updateDraft({ maneiraDispensacao: formatImhMedUppercase(e.target.value) })
              }
              size="small"
              fullWidth
              multiline
              minRows={2}
              sx={multilineFieldSx}
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
        <ImhMedicamentoPlanilhaPreview
          value={value}
          editingLinhaId={editingLinhaId}
          importing={importing}
          onImportClick={handleImportClick}
          onEditLinha={handleEditLinha}
          onDeleteLinha={handleDeleteLinha}
        />
        {nipNaoCadastrado ? (
          <Alert
            severity="warning"
            variant="filled"
            sx={{ mt: 1.25, fontWeight: 800, letterSpacing: 0.3 }}
            onClose={() => setNipNaoCadastrado(false)}
          >
            {NIP_NAO_CADASTRADO}
          </Alert>
        ) : null}
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
