import { useRef, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { DivMaterialPlanilhaPreview } from '@/components/clinica/DivMaterialPlanilhaPreview'
import { formatCnpj } from '@/utils/format'
import {
  createEmptyDivMaterialLinha,
  DIV_MATERIAL_COLUNAS,
  divMaterialLinhaHasContent,
  sortDivMaterialLinhas,
  withNormalizedDivMaterialLinha,
  type DivMaterialLinha,
} from '@/utils/divMaterialForm'
import { formatImhData, formatImhNip, formatImhUppercase } from '@/utils/imhAbaForm'
import { formatValorBrasileiro, parseValorBrasileiro } from '@/utils/consumoMaterialOds'

interface DivMaterialFormProps {
  linhas: DivMaterialLinha[]
  onChange: (next: DivMaterialLinha[]) => void
  selectedIds?: Set<string>
  onSelectedIdsChange?: (next: Set<string>) => void
  finalizedIds?: Set<string>
  devolvidosIds?: Set<string>
  onRequestClear?: () => void
  dataFiltro: import('@/utils/planilhaDataFiltro').PlanilhaDataFiltro
  onDataFiltroChange: (next: import('@/utils/planilhaDataFiltro').PlanilhaDataFiltro) => void
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
  if (key === 'valorTotal') {
    const n = parseValorBrasileiro(raw)
    return n > 0 ? formatValorBrasileiro(n) : raw
  }
  if (
    key === 'modalidadeLicitatoria' ||
    key === 'descricaoMaterial' ||
    key === 'nomePaciente' ||
    key === 'fornecedor'
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
  devolvidosIds,
  onRequestClear,
  dataFiltro,
  onDataFiltroChange,
}: DivMaterialFormProps) {
  const [linhaDraft, setLinhaDraft] = useState<DivMaterialLinha>(() => createEmptyDivMaterialLinha())
  const [editingLinhaId, setEditingLinhaId] = useState<string | null>(null)
  const linhaSnapshotRef = useRef<DivMaterialLinha | null>(null)
  const linhaFormRef = useRef<HTMLDivElement | null>(null)

  const persistLinhas = (next: DivMaterialLinha[]) => {
    onChange(
      sortDivMaterialLinhas(
        next.map(withNormalizedDivMaterialLinha).filter(divMaterialLinhaHasContent),
      ),
    )
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

  const fieldFullWidth = new Set(['descricaoMaterial', 'nomePaciente', 'fornecedor'])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
      <DivMaterialPlanilhaPreview
        linhas={linhas}
        editingLinhaId={editingLinhaId}
        selectedIds={selectedIds}
        onSelectedIdsChange={onSelectedIdsChange}
        finalizedIds={finalizedIds}
        devolvidosIds={devolvidosIds}
        onEditLinha={handleEditLinha}
        onDeleteLinha={handleDeleteLinha}
        onRequestClear={onRequestClear}
        dataFiltro={dataFiltro}
        onDataFiltroChange={onDataFiltroChange}
      />

      <Dialog
        open={Boolean(editingLinhaId)}
        onClose={handleCancelLinha}
        fullWidth
        maxWidth="sm"
        // Acima da planilha expandida (modal + 10).
        sx={{ zIndex: (t) => t.zIndex.modal + 20 }}
        slotProps={{
          paper: {
            sx: { borderRadius: 2.5 },
          },
        }}
      >
        <DialogTitle sx={{ pb: 0.5, fontWeight: 800 }}>
          Editando — Div. Material
          <Typography
            component="span"
            variant="body2"
            color="text.secondary"
            sx={{ display: 'block', fontWeight: 400, mt: 0.35 }}
          >
            Altere o lançamento selecionado. A planilha atualiza ao vivo.
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 1.5 }}>
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
                const multiline = key === 'descricaoMaterial'
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
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={handleCancelLinha} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAdicionarLinha}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Salvar lançamento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
