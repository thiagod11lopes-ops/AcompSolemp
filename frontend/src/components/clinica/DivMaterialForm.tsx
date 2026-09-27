import { useRef, useState } from 'react'
import { Box, TextField } from '@mui/material'
import { DivMaterialPlanilhaPreview } from '@/components/clinica/DivMaterialPlanilhaPreview'
import {
  PlanilhaEditSection,
  PlanilhaLinhaEditDialog,
  planilhaEditFieldSx,
  planilhaEditMultilineSx,
} from '@/components/clinica/PlanilhaLinhaEditDialog'
import { formatCnpj } from '@/utils/format'
import {
  createEmptyDivMaterialLinha,
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
  const [sheetExpanded, setSheetExpanded] = useState(false)
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

  const setField = (key: keyof Omit<DivMaterialLinha, 'id' | 'sourceKey'>, raw: string) => {
    updateDraft({ [key]: formatFieldValue(key, raw) } as Partial<
      Omit<DivMaterialLinha, 'id' | 'sourceKey'>
    >)
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
    if (!sheetExpanded) {
      requestAnimationFrame(() => {
        linhaFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
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
        onExpandedChange={setSheetExpanded}
      />

      <PlanilhaLinhaEditDialog
        open={Boolean(editingLinhaId)}
        title="Editar Div. Material"
        badge="Div. Material"
        onClose={handleCancelLinha}
        onSave={handleAdicionarLinha}
        dockBelowRow={sheetExpanded}
      >
        <Box ref={linhaFormRef} sx={{ display: 'grid', gap: 1 }}>
          <PlanilhaEditSection title="Procedimento" columns={3}>
            <TextField
              label="Data do procedimento"
              value={linhaDraft.dataProcedimento}
              onChange={(e) => setField('dataProcedimento', e.target.value)}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="Modalidade licitatória"
              value={linhaDraft.modalidadeLicitatoria}
              onChange={(e) => setField('modalidadeLicitatoria', e.target.value)}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="UASG"
              value={linhaDraft.uasg}
              onChange={(e) => setField('uasg', e.target.value)}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="NUP (modalidade)"
              value={linhaDraft.nupModalidade}
              onChange={(e) => setField('nupModalidade', e.target.value)}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="N° do item"
              value={linhaDraft.numeroItem}
              onChange={(e) => setField('numeroItem', e.target.value)}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="NIP"
              value={linhaDraft.nip}
              onChange={(e) => setField('nip', e.target.value)}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
          </PlanilhaEditSection>

          <PlanilhaEditSection title="Material e paciente" columns={3}>
            <TextField
              label="Descrição do material"
              value={linhaDraft.descricaoMaterial}
              onChange={(e) => setField('descricaoMaterial', e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={2}
              maxRows={3}
              sx={planilhaEditMultilineSx}
            />
            <TextField
              label="Nome do paciente"
              value={linhaDraft.nomePaciente}
              onChange={(e) => setField('nomePaciente', e.target.value)}
              size="small"
              fullWidth
              sx={{ ...planilhaEditFieldSx, gridColumn: { sm: 'span 2' } }}
            />
            <TextField
              label="Fornecedor"
              value={linhaDraft.fornecedor}
              onChange={(e) => setField('fornecedor', e.target.value)}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
          </PlanilhaEditSection>

          <PlanilhaEditSection title="Documentação e valor" columns={4}>
            <TextField
              label="Mapa"
              value={linhaDraft.mapa}
              onChange={(e) => setField('mapa', e.target.value)}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="Vale de sala"
              value={linhaDraft.valeSala}
              onChange={(e) => setField('valeSala', e.target.value)}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="Vigência"
              value={linhaDraft.vigencia}
              onChange={(e) => setField('vigencia', e.target.value)}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="NUP SIGAD"
              value={linhaDraft.nupSigad}
              onChange={(e) => setField('nupSigad', e.target.value)}
              size="small"
              fullWidth
              sx={planilhaEditFieldSx}
            />
            <TextField
              label="CNPJ"
              value={linhaDraft.cnpj}
              onChange={(e) => setField('cnpj', e.target.value)}
              size="small"
              fullWidth
              sx={{ ...planilhaEditFieldSx, gridColumn: { sm: 'span 2' } }}
            />
            <TextField
              label="Valor Total"
              value={linhaDraft.valorTotal}
              onChange={(e) => setField('valorTotal', e.target.value)}
              size="small"
              fullWidth
              sx={{ ...planilhaEditFieldSx, gridColumn: { sm: 'span 2' } }}
            />
          </PlanilhaEditSection>
        </Box>
      </PlanilhaLinhaEditDialog>
    </Box>
  )
}
