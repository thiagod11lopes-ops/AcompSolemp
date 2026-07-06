import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import type { MesConsumoModelo } from '@/utils/consumoMaterialTemplate'
import {
  buildImhPlanilhaFromConsumo,
  createImhLinhaMaterial,
  createImhLinhaPaciente,
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

export type InserirLinhaPosicao = 'above' | 'below'

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

  const inserirLinha = useCallback((relativeLinhaId: string, position: InserirLinhaPosicao) => {
    setLinhas((prev) => {
      const refIndex = prev.findIndex((l) => l.id === relativeLinhaId)
      if (refIndex === -1) return prev

      const ref = prev[refIndex]
      const insertIndex = position === 'above' ? refIndex : refIndex + 1
      const isFirstInGroup =
        prev.findIndex((l) => l.pacienteGrupoId === ref.pacienteGrupoId) === refIndex

      let nova: ImhLinha
      if (position === 'above' && ref.isLinhaPaciente && isFirstInGroup) {
        nova = createImhLinhaPaciente()
      } else {
        const count = prev.filter((l) => l.pacienteGrupoId === ref.pacienteGrupoId).length
        nova = createImhLinhaMaterial(ref.pacienteGrupoId, count)
      }

      const next = [...prev]
      next.splice(insertIndex, 0, nova)
      return next
    })
  }, [])

  const excluirLinha = useCallback((linhaId: string) => {
    setLinhas((prev) => {
      if (prev.length <= 1) return prev
      const index = prev.findIndex((l) => l.id === linhaId)
      if (index === -1) return prev

      const removed = prev[index]
      const next = prev.filter((l) => l.id !== linhaId)

      if (removed.isLinhaPaciente) {
        const successor = next.find((l) => l.pacienteGrupoId === removed.pacienteGrupoId)
        if (successor) {
          return next.map((l) =>
            l.id === successor.id ? { ...l, isLinhaPaciente: true } : l,
          )
        }
      }

      return next
    })
  }, [])

  return {
    cabecalho,
    linhas,
    savedAt,
    isSaving,
    updateCabecalho,
    updateLinha,
    inserirLinha,
    excluirLinha,
  }
}
