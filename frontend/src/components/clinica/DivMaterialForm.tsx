import { useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import { DivMaterialPlanilhaPreview } from '@/components/clinica/DivMaterialPlanilhaPreview'
import { formatCnpj } from '@/utils/format'
import {
  createEmptyDivMaterialLinha,
  DIV_MATERIAL_COLUNAS,
  divMaterialLinhaHasContent,
  withNormalizedDivMaterialLinha,
  type DivMaterialLinha,
} from '@/utils/divMaterialForm'
import { formatImhData, formatImhNip, formatImhUppercase } from '@/utils/imhAbaForm'

interface DivMaterialFormProps {
  linhas: DivMaterialLinha[]
  onChange: (next: DivMaterialLinha[]) => void
  selectedIds?: Set<string>
  onSelectedIdsChange?: (next: Set<string>) => void
  finalizedIds?: Set<string>
  onRequestClear?: () => void
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

function cloneLinha(linha: DivMaterialLinha): DivMaterialLinha {
  return { ...linha }
}

function formatFieldValue(key: keyof DivMaterialLinha, raw: string): string {
  if (key === 'nip') return formatImhNip(raw)
  if (key === 'cnpj') return formatCnpj(raw) || raw.replace(/\D/g, '').slice(0, 14)
  if (key === 'dataProcedimento') return formatImhData(raw)
  if (
    key === 'modalidadeLicitatoria' ||
    key === 'descricaoMaterial' ||
    key === 'nomePaciente' ||
    key === 'fornecedor' ||
    key === 'anexoAtaHomologacao'
  ) {
    return formatImhUppercase(raw)
  }
  return raw
}

export function DivMaterialForm({
  linhas,
  onChange,
  selectedIds,
  onSelectedIdsChange,
  finalizedIds,
  onRequestClear,
}: DivMaterialFormProps) {
  const [linhaDraft, setLinhaDraft] = useState<DivMaterialLinha>(() => createEmptyDivMaterialLinha())
  const [editingLinhaId, setEditingLinhaId] = useState<string | null>(null)
  const linhaSnapshotRef = useRef<DivMaterialLinha | null>(null)
  const linhaFormRef = useRef<HTMLDivElement | null>(null)

  const persistLinhas = (next: DivMaterialLinha[]) => {
    onChange(next.map(withNormalizedDivMaterialLinha).filter(divMaterialLinhaHasContent))
  }

  const syncDraftToList = (nextDraft: DivMaterialLinha) => {
    const ready = withNormalizedDivMaterialLinha(nextDraft)
    setLinhaDraft(ready)
    if (!editingLinhaId) return
    persistLinhas(
      linhas.map((l) => (l.id === editingLinhaId ? { ...ready, id: editingLinhaId } : l)),
    )
  }

  const updateDraft = (patch: Partial<Omit<DivMaterialLinha, 'id' | 'sourceKey'>>) => {
    syncDraftToList(withNormalizedDivMaterialLinha({ ...linhaDraft, ...patch }))
  }

  const resetLinhaForm = () => {
    setLinhaDraft(createEmptyDivMaterialLinha())
    setEditingLinhaId(null)
    linhaSnapshotRef.current = null
  }

  const handleAdicionarLinha = () => {
    const ready = withNormalizedDivMaterialLinha(linhaDraft)
    if (editingLinhaId) {
      persistLinhas(
        linhas.map((l) => (l.id === editingLinhaId ? { ...ready, id: editingLinhaId } : l)),
      )
      resetLinhaForm()
      return
    }
    if (!divMaterialLinhaHasContent(ready)) {
      resetLinhaForm()
      return
    }
    persistLinhas([...linhas, ready])
    resetLinhaForm()
  }

  const handleEditLinha = (id: string) => {
    const found = linhas.find((l) => l.id === id)
    if (!found) return
    linhaSnapshotRef.current = cloneLinha(found)
    setEditingLinhaId(id)
    setLinhaDraft(cloneLinha(found))
    requestAnimationFrame(() => {
      linhaFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const handleDeleteLinha = (id: string) => {
    if (editingLinhaId === id) resetLinhaForm()
    persistLinhas(linhas.filter((l) => l.id !== id))
    onSelectedIdsChange?.(
      new Set([...(selectedIds ?? [])].filter((selectedId) => selectedId !== id)),
    )
  }

  const handleCancelLinha = () => {
    if (editingLinhaId && linhaSnapshotRef.current) {
      persistLinhas(
        linhas.map((l) =>
          l.id === editingLinhaId ? cloneLinha(linhaSnapshotRef.current!) : l,
        ),
      )
    }
    resetLinhaForm()
  }

  const fieldFullWidth = new Set([
    'descricaoMaterial',
    'nomePaciente',
    'fornecedor',
    'anexoAtaHomologacao',
  ])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Alert severity="info" sx={{ py: 0.5 }}>
        Preenchida pelo MODELO importado (Mapa ← Processo, Vigência ← J:K:L, Fornecedor/CNPJ
        separados). Clique em Editar na linha para abrir o formulário. Marque o checklist para
        enviar à Confecção de Solemp.
      </Alert>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: editingLinhaId
            ? { xs: '1fr', xl: 'minmax(340px, 400px) minmax(0, 1fr)' }
            : '1fr',
          alignItems: 'start',
        }}
      >
        {editingLinhaId ? (
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
              Editando — Div. Material
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Altere o lançamento selecionado. A planilha atualiza ao vivo.
            </Typography>
          </Box>

          <Box ref={linhaFormRef}>
            <Typography
              variant="overline"
              sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.65rem', lineHeight: 1.2 }}
            >
              Lançamento
            </Typography>
            <Box
              sx={{
                mt: 0.5,
                display: 'grid',
                gap: 0.85,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              }}
            >
              {DIV_MATERIAL_COLUNAS.map((col) => {
                const key = col.key
                const multiline = key === 'descricaoMaterial' || key === 'anexoAtaHomologacao'
                return (
                  <TextField
                    key={key}
                    label={col.label}
                    value={String(linhaDraft[key] ?? '')}
                    onChange={(e) =>
                      updateDraft({ [key]: formatFieldValue(key, e.target.value) } as Partial<
                        Omit<DivMaterialLinha, 'id' | 'sourceKey'>
                      >)
                    }
                    size="small"
                    fullWidth
                    multiline={multiline}
                    minRows={multiline ? 2 : undefined}
                    sx={
                      fieldFullWidth.has(key) || multiline
                        ? multiline
                          ? multilineFieldSx
                          : { ...compactFieldSx, gridColumn: { sm: '1 / -1' } }
                        : compactFieldSx
                    }
                  />
                )
              })}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                variant="contained"
                onClick={handleAdicionarLinha}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Salvar lançamento
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={handleCancelLinha}
                sx={{ textTransform: 'none' }}
              >
                Cancelar
              </Button>
            </Box>
          </Box>
        </Paper>
        ) : null}

        <Box sx={{ minWidth: 0 }}>
          <DivMaterialPlanilhaPreview
            linhas={linhas}
            editingLinhaId={editingLinhaId}
            selectedIds={selectedIds}
            onSelectedIdsChange={onSelectedIdsChange}
            finalizedIds={finalizedIds}
            onEditLinha={handleEditLinha}
            onDeleteLinha={handleDeleteLinha}
            onRequestClear={onRequestClear}
          />
        </Box>
      </Box>
    </Box>
  )
}
