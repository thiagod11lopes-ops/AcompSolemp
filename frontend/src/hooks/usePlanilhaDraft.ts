import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import type { MesConsumoModelo } from '@/utils/consumoMaterialTemplate'
import {
  buildImhPlanilhaFromConsumo,
  createImhLinhaMaterial,
  type ImhCabecalho,
  type ImhColunaKey,
  type ImhLinha,
} from '@/utils/imhPlanilhaTemplate'
import {
  loadPlanilhaDraft,
  savePlanilhaDraft,
  type PlanilhaDraftType,
} from '@/utils/planilhaDraftStorage'

const AUTOSAVE_MS = 400

const EMPTY_CABECALHO: ImhCabecalho = {
  numeroRelacao: '',
  pregaoTad: '',
  data: '',
  vigencia: '',
  processo: '',
  fornecedor: '',
}

export function usePlanilhaDraft(
  type: PlanilhaDraftType,
  open: boolean,
  consumoRows: ConsumoMaterialRow[],
  mesReferencia?: MesConsumoModelo,
) {
  const rowIds = useMemo(
    () => consumoRows.map((r) => r.id).sort(),
    [consumoRows],
  )
  const rowIdsKey = rowIds.join(',')

  const [cabecalho, setCabecalho] = useState<ImhCabecalho>(EMPTY_CABECALHO)
  const [linhas, setLinhas] = useState<ImhLinha[]>([])
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const initializedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open || consumoRows.length === 0) return
    const initKey = `${type}:${rowIdsKey}`
    if (initializedRef.current === initKey) return
    initializedRef.current = initKey

    const draft = loadPlanilhaDraft(type, rowIds)
    if (draft) {
      setCabecalho(draft.cabecalho)
      setLinhas(draft.linhas)
      setSavedAt(draft.savedAt)
      return
    }

    const planilha = buildImhPlanilhaFromConsumo(consumoRows, mesReferencia)
    setCabecalho(planilha.cabecalho)
    setLinhas(planilha.linhas)
    setSavedAt(null)
  }, [open, consumoRows, mesReferencia, type, rowIds, rowIdsKey])

  useEffect(() => {
    if (!open) {
      initializedRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open || linhas.length === 0 || rowIds.length === 0) return
    setIsSaving(true)
    const timer = window.setTimeout(() => {
      const at = savePlanilhaDraft(type, rowIds, cabecalho, linhas)
      setSavedAt(at)
      setIsSaving(false)
    }, AUTOSAVE_MS)
    return () => window.clearTimeout(timer)
  }, [cabecalho, linhas, open, rowIds, type])

  const updateCabecalho = useCallback((field: keyof ImhCabecalho, value: string) => {
    setCabecalho((prev) => ({ ...prev, [field]: value }))
  }, [])

  const updateLinha = useCallback((id: string, field: ImhColunaKey, value: string) => {
    setLinhas((prev) =>
      prev.map((linha) => (linha.id === id ? { ...linha, [field]: value } : linha)),
    )
  }, [])

  const adicionarMaterial = useCallback((pacienteGrupoId: string) => {
    setLinhas((prev) => {
      const doGrupo = prev.filter((l) => l.pacienteGrupoId === pacienteGrupoId)
      const ultimoIndex = prev.findLastIndex((l) => l.pacienteGrupoId === pacienteGrupoId)
      const nova = createImhLinhaMaterial(pacienteGrupoId, doGrupo.length)
      const next = [...prev]
      next.splice(ultimoIndex + 1, 0, nova)
      return next
    })
  }, [])

  const grupos = useMemo(() => {
    const ids: string[] = []
    for (const linha of linhas) {
      if (!ids.includes(linha.pacienteGrupoId)) ids.push(linha.pacienteGrupoId)
    }
    return ids
  }, [linhas])

  return {
    cabecalho,
    linhas,
    grupos,
    savedAt,
    isSaving,
    updateCabecalho,
    updateLinha,
    adicionarMaterial,
  }
}
