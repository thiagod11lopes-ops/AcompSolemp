import { useRef, useState } from 'react'
import { Add as AddIcon } from '@mui/icons-material'
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import type { ConmedComrjFormData, ConmedComrjMaterialItem } from '@/types'
import { ConmedComrjPlanilhaPreview } from '@/components/clinica/ConmedComrjPlanilhaPreview'
import {
  createEmptyConmedMaterialItem,
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
  withRecalculatedMaterialTotal,
  withRecalculatedMateriais,
} from '@/utils/conmedComrjForm'

interface ConmedComrjFormProps {
  value: ConmedComrjFormData
  onChange: (next: ConmedComrjFormData) => void
}

const compactFieldSx = {
  '& .MuiInputBase-root': { fontSize: '0.78rem' },
  '& .MuiInputBase-input': { fontSize: '0.78rem', py: 0.65 },
  '& .MuiInputLabel-root': { fontSize: '0.78rem' },
  '& .MuiFormHelperText-root': { fontSize: '0.68rem', mt: 0.25 },
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

function cloneMaterial(item: ConmedComrjMaterialItem): ConmedComrjMaterialItem {
  return { ...item }
}

export function ConmedComrjForm({ value, onChange }: ConmedComrjFormProps) {
  const [draft, setDraft] = useState<ConmedComrjMaterialItem>(() => createEmptyConmedMaterialItem())
  const [editingId, setEditingId] = useState<string | null>(null)
  const editSnapshotRef = useRef<ConmedComrjMaterialItem | null>(null)
  const materialFormRef = useRef<HTMLDivElement | null>(null)

  const setField = <K extends keyof ConmedComrjFormData>(
    key: K,
    fieldValue: ConmedComrjFormData[K],
  ) => {
    onChange({ ...value, [key]: fieldValue })
  }

  const persistMateriais = (materiais: ConmedComrjMaterialItem[]) => {
    onChange({ ...value, ...withRecalculatedMateriais(materiais) })
  }

  const updateDraft = (patch: Partial<Omit<ConmedComrjMaterialItem, 'id' | 'valorTotal'>>) => {
    const next = withRecalculatedMaterialTotal({ ...draft, ...patch })
    setDraft(next)
    if (editingId) {
      persistMateriais(
        value.materiais.map((item) => (item.id === editingId ? { ...next, id: editingId } : item)),
      )
    }
  }

  const resetDraftForm = () => {
    setDraft(createEmptyConmedMaterialItem())
    setEditingId(null)
    editSnapshotRef.current = null
  }

  const handleAdicionar = () => {
    const ready = withRecalculatedMaterialTotal(draft)

    if (editingId) {
      const next = value.materiais.map((item) =>
        item.id === editingId ? { ...ready, id: editingId } : item,
      )
      persistMateriais(next)
      resetDraftForm()
      return
    }

    if (!materialHasContent(ready)) {
      resetDraftForm()
      return
    }

    persistMateriais([...value.materiais, ready])
    resetDraftForm()
  }

  const handleEditMaterial = (id: string) => {
    const found = value.materiais.find((item) => item.id === id)
    if (!found) return
    editSnapshotRef.current = cloneMaterial(found)
    setEditingId(id)
    setDraft(cloneMaterial(found))
    requestAnimationFrame(() => {
      materialFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const handleDeleteMaterial = (id: string) => {
    persistMateriais(value.materiais.filter((item) => item.id !== id))
    if (editingId === id) {
      resetDraftForm()
    }
  }

  const handleCancelEdit = () => {
    if (editingId && editSnapshotRef.current) {
      persistMateriais(
        value.materiais.map((item) =>
          item.id === editingId ? cloneMaterial(editSnapshotRef.current!) : item,
        ),
      )
    }
    resetDraftForm()
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
            Cada Nº/processo forma uma tabela. Ao preencher, a planilha unificada atualiza ao vivo.
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
              placeholder="Somente números"
              size="small"
              fullWidth
              inputMode="numeric"
              sx={compactFieldSx}
            />
            <TextField
              label="Pregão/TAD"
              value={value.pregaoTad}
              onChange={(e) => setField('pregaoTad', formatConmedPregaoTad(e.target.value))}
              placeholder="58/2025 COMRJ"
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
              placeholder="CONMED –  23.351.545/0003-00"
              size="small"
              fullWidth
              sx={{ ...compactFieldSx, gridColumn: { sm: '1 / -1' } }}
            />
          </Box>
        </Box>

        <Box>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem', lineHeight: 1.2 }}
          >
            Dados do paciente
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
              label="NIP"
              value={value.pacienteNip}
              onChange={(e) => setField('pacienteNip', formatConmedPacienteNip(e.target.value))}
              placeholder="00.0000.00"
              size="small"
              fullWidth
              inputMode="numeric"
              sx={compactFieldSx}
            />
            <TextField
              label="INICIAIS"
              value={value.pacienteIniciais}
              onChange={(e) => setField('pacienteIniciais', formatConmedUppercase(e.target.value))}
              placeholder="ABC"
              size="small"
              fullWidth
              sx={compactFieldSx}
              slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
            />
            <TextField
              label="Data"
              value={value.pacienteData}
              onChange={(e) => setField('pacienteData', formatConmedData(e.target.value))}
              placeholder="dd/mm/aaaa"
              size="small"
              fullWidth
              sx={{ ...compactFieldSx, gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              label="PROCEDIMENTO"
              value={value.pacienteProcedimento}
              onChange={(e) =>
                setField('pacienteProcedimento', formatConmedUppercase(e.target.value))
              }
              size="small"
              fullWidth
              multiline
              minRows={3}
              maxRows={8}
              sx={multilineFieldSx}
              slotProps={{
                htmlInput: {
                  style: { textTransform: 'uppercase', resize: 'vertical' },
                },
              }}
            />
          </Box>
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
              {editingId ? (
                <Button
                  size="small"
                  variant="text"
                  onClick={handleCancelEdit}
                  sx={{ fontSize: '0.72rem', py: 0.25, px: 1, minHeight: 28 }}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={handleAdicionar}
                sx={{ fontSize: '0.72rem', py: 0.25, px: 1, minHeight: 28 }}
              >
                {editingId ? 'Salvar' : 'Adicionar'}
              </Button>
            </Box>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.75, fontSize: '0.68rem' }}
          >
            {editingId
              ? 'Editando material da planilha. Salvar grava e limpa o formulário.'
              : 'Preencha o material e clique em Adicionar. O formulário limpa para o próximo.'}
          </Typography>

          <Paper
            variant="outlined"
            key={editingId ?? draft.id}
            sx={{ p: 1, display: 'grid', gap: 0.75, bgcolor: 'background.paper' }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
              {editingId
                ? `Editando material ${
                    value.materiais.findIndex((item) => item.id === editingId) + 1
                  }`
                : 'Novo material'}
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
                value={draft.mapaDaSala}
                onChange={(e) =>
                  updateDraft({ mapaDaSala: formatConmedNumerico(e.target.value) })
                }
                size="small"
                fullWidth
                inputMode="numeric"
                sx={compactFieldSx}
              />
              <TextField
                label="DANFE"
                value={draft.danfe}
                onChange={(e) => updateDraft({ danfe: formatConmedNumerico(e.target.value) })}
                size="small"
                fullWidth
                inputMode="numeric"
                sx={compactFieldSx}
              />
              <TextField
                label="ITEM"
                value={draft.item}
                onChange={(e) => updateDraft({ item: formatConmedNumerico(e.target.value) })}
                size="small"
                fullWidth
                inputMode="numeric"
                sx={compactFieldSx}
              />
              <TextField
                label="NEB/PI"
                value={draft.nebPi}
                onChange={(e) => updateDraft({ nebPi: formatConmedNebPi(e.target.value) })}
                size="small"
                fullWidth
                sx={compactFieldSx}
                slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
              />
              <TextField
                label="DESCRIÇÃO DO MATERIAL"
                value={draft.descricao}
                onChange={(e) =>
                  updateDraft({ descricao: formatConmedUppercase(e.target.value) })
                }
                size="small"
                fullWidth
                multiline
                minRows={3}
                maxRows={8}
                sx={multilineFieldSx}
                slotProps={{
                  htmlInput: {
                    style: { textTransform: 'uppercase', resize: 'vertical' },
                  },
                }}
              />
              <TextField
                label="QT"
                value={draft.qt}
                onChange={(e) => updateDraft({ qt: formatConmedQuantidade(e.target.value) })}
                size="small"
                fullWidth
                inputMode="decimal"
                sx={compactFieldSx}
              />
              <TextField
                label="VALOR UNIT"
                value={draft.valorUnit}
                onChange={(e) => updateDraft({ valorUnit: formatConmedMoeda(e.target.value) })}
                placeholder="R$ 0,00"
                size="small"
                fullWidth
                inputMode="numeric"
                sx={compactFieldSx}
              />
              <TextField
                label="VALOR TOTAL"
                value={draft.valorTotal}
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
        <ConmedComrjPlanilhaPreview
          value={value}
          editingMaterialId={editingId}
          onEditMaterial={handleEditMaterial}
          onDeleteMaterial={handleDeleteMaterial}
        />
      </Box>
    </Box>
  )
}
