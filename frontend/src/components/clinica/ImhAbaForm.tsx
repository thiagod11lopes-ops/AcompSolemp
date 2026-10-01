import { useEffect, useMemo, useRef, useState } from 'react'
import { DeleteOutlined as DeleteOutlineIcon } from '@mui/icons-material'
import {
  Alert,
  Box,
  Chip,
  IconButton,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import type { ImhAbaFormData, ImhAbaLinha } from '@/types'
import { ConmedEscolherAbaModal } from '@/components/clinica/ConmedEscolherAbaModal'
import { ImhAbaPlanilhaPreview } from '@/components/clinica/ImhAbaPlanilhaPreview'
import {
  PlanilhaEditSection,
  PlanilhaLinhaEditDialog,
  planilhaEditFieldSx,
  planilhaEditMultilineSx,
  planilhaEditSelectSlotProps,
} from '@/components/clinica/PlanilhaLinhaEditDialog'
import { premiumTokens } from '@/theme/tokens'
import {
  formatValorBrasileiro,
  type SpreadsheetSheetImport,
} from '@/utils/consumoMaterialOds'
import {
  calcImhSomasValorEIndenizar,
  createEmptyImhAbaLinha,
  formatImhData,
  formatImhMoeda,
  formatImhNip,
  formatImhNumeroCp,
  formatImhQuantidade,
  formatImhUppercase,
  imhLinhasMesmoNipQue,
  isVinculoTitular,
  linhaHasContent,
  normalizeImhAbaForm,
  normalizeImhVinculo,
  withRecalculatedImhLinha,
  sortImhLinhasByData,
} from '@/utils/imhAbaForm'
import {
  findImhSheetIndex,
  loadImhSheetsFromFile,
  mergeImhImport,
  parseImhAbaFromGrid,
} from '@/utils/imhAbaImport'

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
  /** Nome da clínica logada — preenche automaticamente o campo Clínica. */
  clinicaNomePadrao?: string
}

const VINCULOS = [
  'TITULAR',
  'DEPENDENTE DIRETO',
  'DEPENDENTE INDIRETO',
  'OUTROS',
] as const

function cloneLinha(linha: ImhAbaLinha): ImhAbaLinha {
  return { ...linha }
}

function cloneLinhas(linhas: ImhAbaLinha[]): ImhAbaLinha[] {
  return linhas.map(cloneLinha)
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
  clinicaNomePadrao = '',
}: ImhAbaFormProps) {
  const [grupoDrafts, setGrupoDrafts] = useState<ImhAbaLinha[]>([])
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const grupoSnapshotRef = useRef<ImhAbaLinha[]>([])
  const linhaFormRef = useRef<HTMLDivElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)

  const editingLinhaId = grupoDrafts[0]?.id ?? null
  /** Âncora do modal: última linha do grupo, para o bloco editado ficar visível acima. */
  const anchorLinhaId = grupoDrafts[grupoDrafts.length - 1]?.id ?? null
  const editingIds = useMemo(() => new Set(grupoDrafts.map((l) => l.id)), [grupoDrafts])
  const isEditingGrupo = grupoDrafts.length > 0
  const isMultiEdit = grupoDrafts.length > 1
  const draftPrincipal = grupoDrafts[0] ?? createEmptyImhAbaLinha()
  const somasGrupo = useMemo(
    () => calcImhSomasValorEIndenizar(grupoDrafts),
    [grupoDrafts],
  )

  /** Preenche Clínica com o nome da clínica logada quando ainda estiver vazio. */
  useEffect(() => {
    const padrao = clinicaNomePadrao.trim()
    if (!padrao) return
    if (value.clinica.trim()) return
    onChange({ ...value, clinica: formatImhUppercase(padrao) })
  }, [clinicaNomePadrao, value, onChange])
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

  const syncGrupoToList = (nextDrafts: ImhAbaLinha[]) => {
    const ready = nextDrafts.map(withRecalculatedImhLinha)
    setGrupoDrafts(ready)
    if (ready.length === 0) return
    const byId = new Map(ready.map((l) => [l.id, l]))
    persistLinhas(
      value.linhas.map((l) => {
        const updated = byId.get(l.id)
        return updated ? { ...updated, id: l.id } : l
      }),
    )
  }

  const updateShared = (patch: Partial<Omit<ImhAbaLinha, 'id' | 'valorTotal'>>) => {
    syncGrupoToList(
      grupoDrafts.map((linha) =>
        withRecalculatedImhLinha({ ...linha, ...patch }),
      ),
    )
  }

  const updateLinhaAt = (
    index: number,
    patch: Partial<Omit<ImhAbaLinha, 'id' | 'valorTotal'>>,
  ) => {
    syncGrupoToList(
      grupoDrafts.map((linha, i) =>
        i === index ? withRecalculatedImhLinha({ ...linha, ...patch }) : linha,
      ),
    )
  }

  const removeLinhaAt = (index: number) => {
    const removed = grupoDrafts[index]
    if (!removed) return
    const nextDrafts = grupoDrafts.filter((_, i) => i !== index)
    setGrupoDrafts(nextDrafts)
    persistLinhas(value.linhas.filter((l) => l.id !== removed.id))
    onSelectedImhIdsChange?.(
      new Set([...(selectedImhIds ?? [])].filter((id) => id !== removed.id)),
    )
    if (nextDrafts.length === 0) {
      grupoSnapshotRef.current = []
    }
  }

  const resetLinhaForm = () => {
    setGrupoDrafts([])
    grupoSnapshotRef.current = []
  }

  const handleSalvarGrupo = () => {
    if (!isEditingGrupo) return
    const ready = grupoDrafts.map(withRecalculatedImhLinha).filter(linhaHasContent)
    const readyIds = new Set(ready.map((l) => l.id))
    const semGrupo = value.linhas.filter((l) => !editingIds.has(l.id))
    persistLinhas([...semGrupo, ...ready])
    // Remove da seleção ids que sumiram por ficarem vazios
    if (selectedImhIds && onSelectedImhIdsChange) {
      const nextSel = new Set(
        [...selectedImhIds].filter((id) => !editingIds.has(id) || readyIds.has(id)),
      )
      onSelectedImhIdsChange(nextSel)
    }
    resetLinhaForm()
  }

  const handleEditLinha = (id: string) => {
    const grupo = imhLinhasMesmoNipQue(value.linhas, id)
    if (grupo.length === 0) return
    const padraoClinica = clinicaNomePadrao.trim()
    if (padraoClinica && !value.clinica.trim()) {
      onChange({ ...value, clinica: formatImhUppercase(padraoClinica) })
    }
    const drafts = grupo.map((found) =>
      cloneLinha({
        ...found,
        vinculo: normalizeImhVinculo(found.vinculo) || found.vinculo,
      }),
    )
    grupoSnapshotRef.current = cloneLinhas(drafts)
    setGrupoDrafts(drafts)
    if (!sheetExpanded) {
      requestAnimationFrame(() => {
        linhaFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }

  const handleDeleteLinha = (id: string) => {
    const grupo = imhLinhasMesmoNipQue(value.linhas, id)
    const ids = new Set(grupo.map((l) => l.id))
    persistLinhas(value.linhas.filter((l) => !ids.has(l.id)))
    onSelectedImhIdsChange?.(
      new Set([...(selectedImhIds ?? [])].filter((sid) => !ids.has(sid))),
    )
    if (grupoDrafts.some((l) => ids.has(l.id))) resetLinhaForm()
  }

  const handleCancelLinha = () => {
    if (grupoSnapshotRef.current.length > 0) {
      const snapById = new Map(grupoSnapshotRef.current.map((l) => [l.id, l]))
      persistLinhas(
        value.linhas.map((l) => {
          const snap = snapById.get(l.id)
          return snap ? cloneLinha(snap) : l
        }),
      )
    }
    resetLinhaForm()
  }

  const nipLabel = draftPrincipal.nip.trim() || '—'
  const modalSubtitle = isMultiEdit
    ? `NIP ${nipLabel} · ${grupoDrafts.length} lançamentos do mesmo NIP`
    : nipLabel !== '—'
      ? `NIP ${nipLabel}`
      : undefined

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
        open={isEditingGrupo}
        title={isMultiEdit ? 'Editar grupo IMH' : 'Editar IMH'}
        subtitle={modalSubtitle}
        badge="IMH"
        onClose={handleCancelLinha}
        onSave={handleSalvarGrupo}
        saveLabel={
          isMultiEdit
            ? `Salvar ${grupoDrafts.length} lançamentos`
            : 'Salvar lançamento'
        }
        anchorLinhaId={anchorLinhaId}
        preferredMaxHeightPx={isMultiEdit ? 900 : 780}
      >
        <Box ref={linhaFormRef} sx={{ display: 'grid', gap: 1.25 }}>
          <PlanilhaEditSection title="Cabeçalho" columns={2}>
            <TextField
              label="Clínica"
              value={value.clinica || formatImhUppercase(clinicaNomePadrao)}
              onChange={(e) => setHeaderField('clinica', formatImhUppercase(e.target.value))}
              placeholder="CLÍNICA DE TRAUMATO-ORTOPEDIA"
              size="small"
              fullWidth
              slotProps={{
                input: {
                  readOnly: Boolean(clinicaNomePadrao.trim()),
                },
              }}
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

          <PlanilhaEditSection
            title={
              isMultiEdit
                ? 'Beneficiário (comum a todos os lançamentos)'
                : 'Beneficiário'
            }
            columns={3}
          >
            <TextField
              label="NIP"
              value={draftPrincipal.nip}
              onChange={(e) => updateShared({ nip: formatImhNip(e.target.value) })}
              placeholder="00.0000.00"
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              select
              label="VÍNCULO"
              value={
                normalizeImhVinculo(draftPrincipal.vinculo) ||
                formatImhUppercase(draftPrincipal.vinculo) ||
                ''
              }
              onChange={(e) => {
                const vinculo =
                  normalizeImhVinculo(e.target.value) || formatImhUppercase(e.target.value)
                updateShared(
                  isVinculoTitular(vinculo) ? { vinculo } : { vinculo, nipTitular: '' },
                )
              }}
              size="small"
              fullWidth
              slotProps={planilhaEditSelectSlotProps}
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
              label="NIP DO TITULAR"
              value={
                isVinculoTitular(draftPrincipal.vinculo)
                  ? draftPrincipal.nip
                  : draftPrincipal.nipTitular
              }
              onChange={(e) => updateShared({ nipTitular: formatImhNip(e.target.value) })}
              placeholder="00.0000.00"
              size="small"
              fullWidth
              slotProps={{
                input: { readOnly: isVinculoTitular(draftPrincipal.vinculo) },
              }}
              title={
                isVinculoTitular(draftPrincipal.vinculo)
                  ? 'Igual ao NIP quando o vínculo é TITULAR'
                  : draftPrincipal.vinculo
                    ? 'Preencha manualmente o NIP do titular'
                    : undefined
              }
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="NOME DO USUÁRIO"
              value={draftPrincipal.nomeUsuario}
              onChange={(e) =>
                updateShared({ nomeUsuario: formatImhUppercase(e.target.value) })
              }
              size="small"
              fullWidth
              sx={{ ...planilhaEditFieldSx, gridColumn: { sm: '1 / -1' } }}
            />
          </PlanilhaEditSection>

          {isMultiEdit ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                flexWrap: 'wrap',
                px: 0.25,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  letterSpacing: 0.35,
                  textTransform: 'uppercase',
                  color: premiumTokens.primaryDark,
                }}
              >
                Lançamentos do NIP
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={`${grupoDrafts.length} linha(s)`}
                  sx={{ height: 22, fontWeight: 700 }}
                />
                {somasGrupo.valorTotal > 0 ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Total ${formatValorBrasileiro(somasGrupo.valorTotal)}`}
                    sx={{ height: 22, fontWeight: 700 }}
                  />
                ) : null}
                {somasGrupo.pctIndenizar > 0 ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Indenizar ${formatValorBrasileiro(somasGrupo.pctIndenizar)}`}
                    sx={{ height: 22, fontWeight: 700 }}
                  />
                ) : null}
              </Box>
            </Box>
          ) : null}

          <Box sx={{ display: 'grid', gap: 1.1 }}>
            {grupoDrafts.map((draft, index) => (
              <Box
                key={draft.id}
                sx={{
                  borderRadius: 1.5,
                  border: `1px solid ${alpha('#0f172a', 0.1)}`,
                  bgcolor: '#fff',
                  overflow: 'hidden',
                  boxShadow: `0 1px 0 ${alpha('#0f172a', 0.04)}`,
                }}
              >
                {isMultiEdit ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      px: 1.35,
                      py: 0.65,
                      bgcolor: alpha(premiumTokens.primary, 0.06),
                      borderBottom: `1px solid ${alpha('#0f172a', 0.06)}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        color: '#0f172a',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Lançamento {index + 1}
                      <Typography
                        component="span"
                        sx={{
                          ml: 0.75,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          color: alpha('#0f172a', 0.55),
                        }}
                      >
                        de {grupoDrafts.length}
                      </Typography>
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`Remover lançamento ${index + 1} do grupo`}
                      onClick={() => removeLinhaAt(index)}
                      sx={{ p: 0.35 }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                ) : null}

                <Box sx={{ p: { xs: 1.1, sm: 1.25 } }}>
                  <PlanilhaEditSection
                    title={isMultiEdit ? 'Procedimento e valores deste lançamento' : 'Procedimento e valores'}
                    columns={4}
                  >
                    <TextField
                      label="DATA"
                      value={draft.data}
                      onChange={(e) =>
                        updateLinhaAt(index, { data: formatImhData(e.target.value) })
                      }
                      placeholder="dd/mm/aa"
                      size="small"
                      fullWidth
                      sx={planilhaEditFieldSx}
                    />
                    <TextField
                      label="VALOR UNIT"
                      value={draft.valorUnit}
                      onChange={(e) =>
                        updateLinhaAt(index, { valorUnit: formatImhMoeda(e.target.value) })
                      }
                      size="small"
                      fullWidth
                      sx={planilhaEditFieldSx}
                    />
                    <TextField
                      label="QUANTI."
                      value={draft.quantidade}
                      onChange={(e) =>
                        updateLinhaAt(index, {
                          quantidade: formatImhQuantidade(e.target.value),
                        })
                      }
                      size="small"
                      fullWidth
                      sx={planilhaEditFieldSx}
                    />
                    <TextField
                      label="VALOR TOTAL"
                      value={draft.valorTotal}
                      size="small"
                      fullWidth
                      slotProps={{ input: { readOnly: true } }}
                      sx={planilhaEditFieldSx}
                    />
                    <TextField
                      label="DESCRIÇÃO DO PROCEDIMENTO/MEDICAMENTO"
                      value={draft.descricao}
                      onChange={(e) =>
                        updateLinhaAt(index, {
                          descricao: formatImhUppercase(e.target.value),
                        })
                      }
                      size="small"
                      fullWidth
                      multiline
                      minRows={1}
                      maxRows={3}
                      sx={planilhaEditMultilineSx}
                    />
                    <TextField
                      label="% A INDENIZAR"
                      value={draft.pctIndenizar}
                      size="small"
                      fullWidth
                      slotProps={{ input: { readOnly: true } }}
                      sx={planilhaEditFieldSx}
                    />
                  </PlanilhaEditSection>
                </Box>
              </Box>
            ))}
          </Box>
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
