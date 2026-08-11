import {
  Box,
  Button,
  Tab,
  Tabs,
  Alert,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import GridOnIcon from '@mui/icons-material/GridOn'
import { useMemo, useState, useCallback, useRef, useEffect, type SyntheticEvent } from 'react'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import type { RowSelectionState } from '@tanstack/react-table'
import { ConsumoMaterialConsignadoView } from '@/components/clinica/ConsumoMaterialConsignadoView'
import type { AdicionarPlanilhaInput } from '@/components/clinica/AdicionarPlanilhaModal'
import { ImhEnvioModal } from '@/components/clinica/ImhEnvioModal'
import { MaterialEnvioModal } from '@/components/clinica/MaterialEnvioModal'
import { ClinicaEnvioParaleloModal } from '@/components/clinica/ClinicaEnvioParaleloModal'
import {
  useCreateClinicaPedido,
  useAdicionarFluxoParalelo,
  useClinicaPedidos,
  useDeleteAllClinicaPedidos,
} from '@/hooks/useClinicaPedidos'
import { useClinicas } from '@/hooks/useCadastros'
import { useClinicaAuth } from '@/contexts/AuthContext'
import {
  consumoRowsToPedidoInput,
  parseConsumoMaterialFile,
  type ConsumoMaterialRow,
} from '@/utils/consumoMaterialOds'
import {
  isLinhaPreenchida,
  buildPlanilhaLancamentos,
  getRowIdsComPedido,
  findPedidoParaMesmasLinhas,
  createPedidoLoteId,
  CONSUMO_PLANILHA_NOME_PADRAO,
  getConsumoMaterialInicial,
  getConsumoMaterialDemoMedicamento,
  rowPodeSerEnviadaAuditoria,
  rowPodeSerEnviadaMaterial,
  getMesAtualModelo,
  getMesModeloFromParts,
  dataPertenceAoMes,
  syncExtraRowsFromMesSheet,
  inicializarLinhasDoMes,
  type MesConsumoModelo,
} from '@/utils/consumoMaterialTemplate'
import {
  CONSUMO_ABA_PRINCIPAL_ID,
  consumoPlanilhaService,
} from '@/services/consumoPlanilhaService'
import type { ConsumoPlanilhaAba } from '@/types'
import {
  DEMO_CLINICA_EXEMPLO_ID,
  DEMO_MEDICAMENTO_EXEMPLO_ID,
  DEMO_EMPENHADO_EXEMPLO_ID,
  ensureDemoExampleMedicamentoPlanilha,
  ensureDemoExampleEmpenhadoPlanilha,
  ensureDemoExamplePlanilha,
} from '@/services/demoCadastrosService'
import { pedidoPlanilhaEnvioService } from '@/services/pedidoPlanilhaEnvioService'
import { loadAppData } from '@/mocks/seed'
import type { ImhPlanilha } from '@/utils/imhPlanilhaTemplate'
import { buildImhPlanilhaFromConsumo } from '@/utils/imhPlanilhaTemplate'
import type { ControleSolempPlanilha } from '@/utils/controleSolempTemplate'
import { buildControleSolempFromConsumo } from '@/utils/controleSolempTemplate'
import type { ConsumoEnvioCanal } from '@/components/clinica/ConsumoMaterialSpreadsheet'

export default function ClinicaNovoPedidoPage() {
  const { navigatePortal, isDemo } = usePortalPaths()
  const createPedido = useCreateClinicaPedido()
  const adicionarFluxo = useAdicionarFluxoParalelo()
  const deleteAllPedidos = useDeleteAllClinicaPedidos()
  const { user } = useClinicaAuth()
  const clinicaId = user?.clinicaId ?? ''
  const { data: pedidos = [] } = useClinicaPedidos()
  const { data: clinicas = [] } = useClinicas()
  const clinicaLogada = clinicas.find((c) => c.id === user?.clinicaId)
  const isMedicamentoPortal =
    user?.perfil === 'MEDICAMENTO' || clinicaLogada?.tipo === 'medicamento'
  const isDemoMedicamentoFixo =
    isDemo && isMedicamentoPortal && clinicaId === DEMO_MEDICAMENTO_EXEMPLO_ID

  const [abaAtiva, setAbaAtiva] = useState(1)
  const [extraRows, setExtraRows] = useState<ConsumoMaterialRow[]>([])
  const [abasExtras, setAbasExtras] = useState<ConsumoPlanilhaAba[]>([])
  const [abaPlanilhaAtivaId, setAbaPlanilhaAtivaId] = useState(CONSUMO_ABA_PRINCIPAL_ID)
  const [planilhaNome, setPlanilhaNome] = useState(CONSUMO_PLANILHA_NOME_PADRAO)
  const [rowSelectionAuditoria, setRowSelectionAuditoria] = useState<RowSelectionState>({})
  const [rowSelectionMaterial, setRowSelectionMaterial] = useState<RowSelectionState>({})
  const [batchError, setBatchError] = useState<string | null>(null)
  const [isBatchSending, setIsBatchSending] = useState(false)
  const [mesSelecionado, setMesSelecionado] = useState<MesConsumoModelo>(getMesAtualModelo)
  const [addPlanilhaError, setAddPlanilhaError] = useState<string | null>(null)
  const [isAdicionandoPlanilha, setIsAdicionandoPlanilha] = useState(false)
  const [imhModalOpen, setImhModalOpen] = useState(false)
  const [imhConsumoRows, setImhConsumoRows] = useState<ConsumoMaterialRow[]>([])
  const [materialModalOpen, setMaterialModalOpen] = useState(false)
  const [materialConsumoRows, setMaterialConsumoRows] = useState<ConsumoMaterialRow[]>([])
  const [paraleloModalOpen, setParaleloModalOpen] = useState(false)
  const [paraleloConsumoRows, setParaleloConsumoRows] = useState<ConsumoMaterialRow[]>([])
  const [paraleloPreview, setParaleloPreview] = useState<'auditoria' | 'confeccao' | null>(null)
  const [rowsByMes, setRowsByMes] = useState<Record<string, ConsumoMaterialRow[]>>({})
  const [rowsByAbaExtra, setRowsByAbaExtra] = useState<Record<string, ConsumoMaterialRow[]>>({})
  const [deletedRowIds, setDeletedRowIds] = useState<Set<string>>(new Set())
  const [finalizedAuditoriaRowIds, setFinalizedAuditoriaRowIds] = useState<Set<string>>(new Set())
  const [finalizedMaterialRowIds, setFinalizedMaterialRowIds] = useState<Set<string>>(new Set())
  const extraRowsSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const planilhaHydrated = useRef(false)
  const abasExtrasRef = useRef(abasExtras)
  const abaPlanilhaAtivaIdRef = useRef(abaPlanilhaAtivaId)
  const extraRowsRef = useRef(extraRows)
  abasExtrasRef.current = abasExtras
  abaPlanilhaAtivaIdRef.current = abaPlanilhaAtivaId
  extraRowsRef.current = extraRows

  useEffect(
    () => () => {
      if (extraRowsSyncTimer.current) clearTimeout(extraRowsSyncTimer.current)
    },
    [],
  )

  const rowIdsComPedido = useMemo(() => {
    const data = loadAppData()
    return getRowIdsComPedido(
      pedidos,
      data.pedidoPlanilhaEnvio,
      data.processosArquivados,
    )
  }, [pedidos, finalizedAuditoriaRowIds, finalizedMaterialRowIds])

  useEffect(() => {
    if (!clinicaId || planilhaHydrated.current) return

    if (isDemo && clinicaId === DEMO_CLINICA_EXEMPLO_ID) {
      ensureDemoExamplePlanilha()
    }
    if (isDemo && clinicaId === DEMO_MEDICAMENTO_EXEMPLO_ID) {
      ensureDemoExampleMedicamentoPlanilha()
    }
    if (isDemo && clinicaId === DEMO_EMPENHADO_EXEMPLO_ID) {
      ensureDemoExampleEmpenhadoPlanilha()
    }

    const persisted = consumoPlanilhaService.getState(clinicaId)
    const isDemoClinica = isDemo && clinicaId === DEMO_CLINICA_EXEMPLO_ID
    const isDemoMedicamento = isDemo && clinicaId === DEMO_MEDICAMENTO_EXEMPLO_ID
    const isDemoEmpenhado = isDemo && clinicaId === DEMO_EMPENHADO_EXEMPLO_ID
    const rowsToLoad =
      persisted.extraRows.length > 0
        ? persisted.extraRows
        : isDemoClinica
          ? getConsumoMaterialInicial()
          : isDemoMedicamento
            ? getConsumoMaterialDemoMedicamento()
            : isDemoEmpenhado
              ? getConsumoMaterialInicial().slice(0, 12).map((row, index) => ({
                  ...row,
                  id: `emp-demo-${index + 1}`,
                  empenho:
                    row.empenho?.trim() ||
                    `2026NE${String(4401 + index).padStart(4, '0')}`,
                }))
              : []

    planilhaHydrated.current = true

    if (rowsToLoad.length > 0) {
      setExtraRows(rowsToLoad)
      if (
        persisted.extraRows.length === 0 &&
        (isDemoClinica || isDemoMedicamento || isDemoEmpenhado)
      ) {
        consumoPlanilhaService.saveState(clinicaId, {
          finalizedRowIds: [],
          finalizedAuditoriaRowIds: [],
          finalizedMaterialRowIds: [],
          extraRows: rowsToLoad,
          abasExtras: [],
          abaAtivaId: CONSUMO_ABA_PRINCIPAL_ID,
        })
      }
    }

    const loadedAbas = persisted.abasExtras ?? []
    setAbasExtras(loadedAbas)
    const loadedAbaAtiva = persisted.abaAtivaId ?? CONSUMO_ABA_PRINCIPAL_ID
    setAbaPlanilhaAtivaId(loadedAbaAtiva)
    if (loadedAbaAtiva !== CONSUMO_ABA_PRINCIPAL_ID) {
      const aba = loadedAbas.find((item) => item.id === loadedAbaAtiva)
      if (aba) setMesSelecionado(getMesModeloFromParts(aba.mes, aba.ano))
    }

    if (persisted.finalizedAuditoriaRowIds?.length || persisted.finalizedRowIds.length > 0) {
      const finalizedAuditoria = new Set(
        persisted.finalizedAuditoriaRowIds ?? persisted.finalizedRowIds,
      )
      setFinalizedAuditoriaRowIds(finalizedAuditoria)
      setRowSelectionAuditoria((prev) => {
        const next = { ...prev }
        for (const rowId of finalizedAuditoria) delete next[rowId]
        return next
      })
    }
    if (persisted.finalizedMaterialRowIds?.length) {
      const finalizedMaterial = new Set(persisted.finalizedMaterialRowIds)
      setFinalizedMaterialRowIds(finalizedMaterial)
      setRowSelectionMaterial((prev) => {
        const next = { ...prev }
        for (const rowId of finalizedMaterial) delete next[rowId]
        return next
      })
    }
  }, [clinicaId, isDemo])

  const persistPlanilhaState = useCallback(
    (
      nextExtraRows: ConsumoMaterialRow[],
      nextFinalizedAuditoria: Set<string>,
      nextFinalizedMaterial: Set<string>,
      nextAbasExtras: ConsumoPlanilhaAba[] = abasExtrasRef.current,
      nextAbaAtivaId: string = abaPlanilhaAtivaIdRef.current,
    ) => {
      if (!clinicaId) return
      consumoPlanilhaService.saveState(clinicaId, {
        finalizedRowIds: [...nextFinalizedAuditoria],
        finalizedAuditoriaRowIds: [...nextFinalizedAuditoria],
        finalizedMaterialRowIds: [...nextFinalizedMaterial],
        extraRows: nextExtraRows,
        abasExtras: nextAbasExtras,
        abaAtivaId: nextAbaAtivaId,
      })
    },
    [clinicaId],
  )

  const planilhaRows = useMemo(
    () => buildPlanilhaLancamentos(pedidos, extraRows, deletedRowIds),
    [pedidos, extraRows, deletedRowIds],
  )

  const abaAtivaExtra = useMemo(
    () => abasExtras.find((aba) => aba.id === abaPlanilhaAtivaId),
    [abasExtras, abaPlanilhaAtivaId],
  )
  const isAbaPrincipal = abaPlanilhaAtivaId === CONSUMO_ABA_PRINCIPAL_ID

  const planilhaAbas = useMemo(
    () => [
      { id: CONSUMO_ABA_PRINCIPAL_ID, nome: 'Consumo Material Consignado' },
      ...abasExtras.map((aba) => ({ id: aba.id, nome: aba.nome })),
    ],
    [abasExtras],
  )

  const activeLancamentos = isAbaPrincipal ? planilhaRows : (abaAtivaExtra?.extraRows ?? [])
  const activeFileName = isAbaPrincipal
    ? planilhaNome || 'Consumo Material Consignado'
    : (abaAtivaExtra?.nome ?? 'Planilha')
  const activeMesSelecionado =
    !isAbaPrincipal && abaAtivaExtra
      ? getMesModeloFromParts(abaAtivaExtra.mes, abaAtivaExtra.ano)
      : mesSelecionado
  const activeRowsByMes = isAbaPrincipal
    ? rowsByMes[mesSelecionado.id]
    : rowsByAbaExtra[abaPlanilhaAtivaId]

  const limparPlanilha = () => {
    setExtraRows([])
    setAbasExtras([])
    setAbaPlanilhaAtivaId(CONSUMO_ABA_PRINCIPAL_ID)
    setRowsByMes({})
    setRowsByAbaExtra({})
    setDeletedRowIds(new Set())
    setFinalizedAuditoriaRowIds(new Set())
    setFinalizedMaterialRowIds(new Set())
    setPlanilhaNome(CONSUMO_PLANILHA_NOME_PADRAO)
    setRowSelectionAuditoria({})
    setRowSelectionMaterial({})
    setBatchError(null)
    if (clinicaId) consumoPlanilhaService.clearState(clinicaId)
  }

  const mergeNovosNasPlanilhas = useCallback(
    (
      novos: ConsumoMaterialRow[],
      nextFinalizedAuditoria: Set<string>,
      nextFinalizedMaterial: Set<string>,
    ) => {
      const ativaId = abaPlanilhaAtivaIdRef.current
      if (ativaId === CONSUMO_ABA_PRINCIPAL_ID) {
        setExtraRows((prev) => {
          const merged = [...prev]
          for (const row of novos) {
            const index = merged.findIndex((item) => item.id === row.id)
            if (index >= 0) merged[index] = row
            else merged.push(row)
          }
          persistPlanilhaState(merged, nextFinalizedAuditoria, nextFinalizedMaterial)
          return merged
        })
        return
      }
      setAbasExtras((prev) => {
        const next = prev.map((aba) => {
          if (aba.id !== ativaId) return aba
          const merged = [...aba.extraRows]
          for (const row of novos) {
            const index = merged.findIndex((item) => item.id === row.id)
            if (index >= 0) merged[index] = row
            else merged.push(row)
          }
          return { ...aba, extraRows: merged }
        })
        persistPlanilhaState(
          extraRowsRef.current,
          nextFinalizedAuditoria,
          nextFinalizedMaterial,
          next,
          ativaId,
        )
        return next
      })
    },
    [persistPlanilhaState],
  )

  const handleRowSelectionAuditoriaChange = useCallback(
    (selection: RowSelectionState) => {
      const next = { ...selection }
      // Enviados ficam só na tarja cinza (finalized), fora da seleção verde.
      for (const rowId of finalizedAuditoriaRowIds) {
        delete next[rowId]
      }
      setRowSelectionAuditoria(next)
    },
    [finalizedAuditoriaRowIds],
  )

  const handleRowSelectionMaterialChange = useCallback(
    (selection: RowSelectionState) => {
      const next = { ...selection }
      for (const rowId of finalizedMaterialRowIds) {
        delete next[rowId]
      }
      setRowSelectionMaterial(next)
    },
    [finalizedMaterialRowIds],
  )

  const handleDesfinalizarLinha = useCallback(
    (rowId: string, canal: ConsumoEnvioCanal) => {
      if (canal === 'auditoria') {
        setFinalizedAuditoriaRowIds((prevFinalized) => {
          const nextFinalized = new Set(prevFinalized)
          nextFinalized.delete(rowId)
          setExtraRows((prevExtra) => {
            persistPlanilhaState(prevExtra, nextFinalized, finalizedMaterialRowIds)
            return prevExtra
          })
          return nextFinalized
        })
        setRowSelectionAuditoria((prev) => {
          const { [rowId]: _, ...rest } = prev
          return rest
        })
        return
      }

      setFinalizedMaterialRowIds((prevFinalized) => {
        const nextFinalized = new Set(prevFinalized)
        nextFinalized.delete(rowId)
        setExtraRows((prevExtra) => {
          persistPlanilhaState(prevExtra, finalizedAuditoriaRowIds, nextFinalized)
          return prevExtra
        })
        return nextFinalized
      })
      setRowSelectionMaterial((prev) => {
        const { [rowId]: _, ...rest } = prev
        return rest
      })
    },
    [persistPlanilhaState, finalizedMaterialRowIds, finalizedAuditoriaRowIds],
  )

  const handleMesRowsChange = useCallback(
    (rows: ConsumoMaterialRow[], mes: MesConsumoModelo) => {
      const ativaId = abaPlanilhaAtivaIdRef.current
      if (ativaId !== CONSUMO_ABA_PRINCIPAL_ID) {
        setRowsByAbaExtra((prev) => ({ ...prev, [ativaId]: rows }))
        if (extraRowsSyncTimer.current) clearTimeout(extraRowsSyncTimer.current)
        extraRowsSyncTimer.current = setTimeout(() => {
          setAbasExtras((prev) => {
            const next = prev.map((aba) => {
              if (aba.id !== ativaId) return aba
              return {
                ...aba,
                mes: mes.mes,
                ano: mes.ano,
                extraRows: syncExtraRowsFromMesSheet(
                  aba.extraRows,
                  rows,
                  mes,
                  rowIdsComPedido,
                ),
              }
            })
            persistPlanilhaState(
              extraRowsRef.current,
              finalizedAuditoriaRowIds,
              finalizedMaterialRowIds,
              next,
              ativaId,
            )
            return next
          })
          extraRowsSyncTimer.current = null
        }, 400)
        return
      }

      setRowsByMes((prev) => ({ ...prev, [mes.id]: rows }))
      if (extraRowsSyncTimer.current) clearTimeout(extraRowsSyncTimer.current)
      extraRowsSyncTimer.current = setTimeout(() => {
        setExtraRows((prev) => {
          const next = syncExtraRowsFromMesSheet(prev, rows, mes, rowIdsComPedido)
          persistPlanilhaState(next, finalizedAuditoriaRowIds, finalizedMaterialRowIds)
          return next
        })
        extraRowsSyncTimer.current = null
      }, 400)
    },
    [rowIdsComPedido, finalizedAuditoriaRowIds, finalizedMaterialRowIds, persistPlanilhaState],
  )

  const handleExcluirLinhaRow = useCallback(
    (rowId: string) => {
      if (rowIdsComPedido.has(rowId)) {
        setDeletedRowIds((prev) => new Set(prev).add(rowId))
      }
    },
    [rowIdsComPedido],
  )

  const handleExcluirTudo = async () => {
    setBatchError(null)
    try {
      await deleteAllPedidos.mutateAsync()
      limparPlanilha()
    } catch {
      setBatchError('Erro ao excluir os lançamentos. Tente novamente.')
      throw new Error('delete failed')
    }
  }

  const handleAdicionarPlanilha = async (input: AdicionarPlanilhaInput) => {
    setAddPlanilhaError(null)
    setIsAdicionandoPlanilha(true)
    try {
      const mesModelo = getMesModeloFromParts(input.mes, input.ano)
      let novos: ConsumoMaterialRow[] = []

      if (input.modo === 'importar') {
        if (!input.file) {
          setAddPlanilhaError('Selecione um arquivo .ods ou .xlsx.')
          throw new Error('no file')
        }
        const rows = await parseConsumoMaterialFile(input.file)
        novos = rows.filter(
          (r) =>
            dataPertenceAoMes(r.data, mesModelo) &&
            !rowIdsComPedido.has(r.id) &&
            !finalizedAuditoriaRowIds.has(r.id) &&
            !finalizedMaterialRowIds.has(r.id),
        )
        if (novos.length === 0) {
          setAddPlanilhaError(
            `Nenhum lançamento encontrado para ${mesModelo.label} no arquivo selecionado.`,
          )
          throw new Error('no rows')
        }
      }

      const novaAba: ConsumoPlanilhaAba = {
        id: `aba-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nome: input.nome.trim() || `Planilha ${mesModelo.label}`,
        mes: input.mes,
        ano: input.ano,
        extraRows: novos,
      }

      setAbasExtras((prev) => {
        const next = [...prev, novaAba]
        persistPlanilhaState(
          extraRowsRef.current,
          finalizedAuditoriaRowIds,
          finalizedMaterialRowIds,
          next,
          novaAba.id,
        )
        return next
      })
      setAbaPlanilhaAtivaId(novaAba.id)
      setMesSelecionado(mesModelo)
      setRowsByAbaExtra((prev) => {
        const next = { ...prev }
        delete next[novaAba.id]
        return next
      })
      setRowSelectionAuditoria({})
      setRowSelectionMaterial({})
      if (novos.length > 0) {
        const initialSelection: RowSelectionState = {}
        novos.slice(0, Math.min(novos.length, 50)).forEach((r) => {
          initialSelection[r.id] = true
        })
        setRowSelectionAuditoria(initialSelection)
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message !== 'no rows' &&
        err.message !== 'no file'
      ) {
        setAddPlanilhaError(err.message || 'Erro ao criar a planilha')
      }
      throw err
    } finally {
      setIsAdicionandoPlanilha(false)
    }
  }

  const handleAbaPlanilhaChange = useCallback(
    (abaId: string) => {
      setAbaPlanilhaAtivaId(abaId)
      setRowSelectionAuditoria({})
      setRowSelectionMaterial({})
      setBatchError(null)
      if (abaId === CONSUMO_ABA_PRINCIPAL_ID) {
        persistPlanilhaState(
          extraRowsRef.current,
          finalizedAuditoriaRowIds,
          finalizedMaterialRowIds,
          abasExtrasRef.current,
          abaId,
        )
        return
      }
      const aba = abasExtrasRef.current.find((item) => item.id === abaId)
      if (aba) setMesSelecionado(getMesModeloFromParts(aba.mes, aba.ano))
      persistPlanilhaState(
        extraRowsRef.current,
        finalizedAuditoriaRowIds,
        finalizedMaterialRowIds,
        abasExtrasRef.current,
        abaId,
      )
    },
    [finalizedAuditoriaRowIds, finalizedMaterialRowIds, persistPlanilhaState],
  )

  const handleFecharAbaPlanilha = useCallback(
    (abaId: string) => {
      setAbasExtras((prev) => {
        const next = prev.filter((aba) => aba.id !== abaId)
        const nextAtiva =
          abaPlanilhaAtivaIdRef.current === abaId
            ? CONSUMO_ABA_PRINCIPAL_ID
            : abaPlanilhaAtivaIdRef.current
        if (abaPlanilhaAtivaIdRef.current === abaId) {
          setAbaPlanilhaAtivaId(CONSUMO_ABA_PRINCIPAL_ID)
          setRowSelectionAuditoria({})
          setRowSelectionMaterial({})
        }
        persistPlanilhaState(
          extraRowsRef.current,
          finalizedAuditoriaRowIds,
          finalizedMaterialRowIds,
          next,
          nextAtiva,
        )
        return next
      })
      setRowsByAbaExtra((prev) => {
        const { [abaId]: _, ...rest } = prev
        return rest
      })
    },
    [finalizedAuditoriaRowIds, finalizedMaterialRowIds, persistPlanilhaState],
  )

  const handleMesSelecionadoChange = useCallback(
    (mes: MesConsumoModelo) => {
      setMesSelecionado(mes)
      const ativaId = abaPlanilhaAtivaIdRef.current
      if (ativaId === CONSUMO_ABA_PRINCIPAL_ID) return
      setAbasExtras((prev) => {
        const next = prev.map((aba) =>
          aba.id === ativaId ? { ...aba, mes: mes.mes, ano: mes.ano } : aba,
        )
        persistPlanilhaState(
          extraRowsRef.current,
          finalizedAuditoriaRowIds,
          finalizedMaterialRowIds,
          next,
          ativaId,
        )
        return next
      })
    },
    [finalizedAuditoriaRowIds, finalizedMaterialRowIds, persistPlanilhaState],
  )

  const getActiveSourceRows = useCallback(() => {
    if (isAbaPrincipal) {
      const mesSheet = rowsByMes[mesSelecionado.id]
      return mesSheet ?? inicializarLinhasDoMes(planilhaRows, mesSelecionado)
    }
    const mes =
      abaAtivaExtra != null
        ? getMesModeloFromParts(abaAtivaExtra.mes, abaAtivaExtra.ano)
        : mesSelecionado
    const sheet = rowsByAbaExtra[abaPlanilhaAtivaId]
    return sheet ?? inicializarLinhasDoMes(abaAtivaExtra?.extraRows ?? [], mes)
  }, [
    isAbaPrincipal,
    rowsByMes,
    mesSelecionado,
    planilhaRows,
    abaAtivaExtra,
    rowsByAbaExtra,
    abaPlanilhaAtivaId,
  ])

  const getSelectedRowsAuditoria = useCallback(() => {
    return getActiveSourceRows().filter(
      (r) =>
        rowSelectionAuditoria[r.id] &&
        rowPodeSerEnviadaAuditoria(r, rowIdsComPedido, finalizedAuditoriaRowIds),
    )
  }, [
    getActiveSourceRows,
    rowSelectionAuditoria,
    rowIdsComPedido,
    finalizedAuditoriaRowIds,
  ])

  const getSelectedRowsImhChecklist = useCallback(() => {
    return getActiveSourceRows().filter(
      (r) => rowSelectionAuditoria[r.id] && isLinhaPreenchida(r),
    )
  }, [getActiveSourceRows, rowSelectionAuditoria])

  const getSelectedRowsAs = useCallback(() => {
    return getActiveSourceRows().filter(
      (r) => rowSelectionAuditoria[r.id] && isLinhaPreenchida(r),
    )
  }, [getActiveSourceRows, rowSelectionAuditoria])

  const handleAbrirImhModal = () => {
    const selectedRows = isMedicamentoPortal
      ? getSelectedRowsImhChecklist()
      : getSelectedRowsAuditoria()
    if (selectedRows.length === 0) {
      setBatchError(
        isMedicamentoPortal
          ? 'Marque o checklist IMH nos lançamentos que deseja enviar.'
          : 'Selecione lançamentos novos preenchidos para enviar.',
      )
      return
    }
    setBatchError(null)
    setImhConsumoRows(selectedRows)
    setImhModalOpen(true)
  }

  const handleAbrirParaleloModal = () => {
    const selectedRows = getSelectedRowsAs()
    if (selectedRows.length === 0) {
      setBatchError('Marque o checklist AS nos lançamentos que deseja enviar.')
      return
    }
    setBatchError(null)
    setParaleloConsumoRows(selectedRows)
    setParaleloModalOpen(true)
  }

  const handleVisualizarAuditoriaParalelo = () => {
    setImhConsumoRows(paraleloConsumoRows)
    setParaleloPreview('auditoria')
    setParaleloModalOpen(false)
    setImhModalOpen(true)
  }

  const handleVisualizarConfeccaoParalelo = () => {
    setMaterialConsumoRows(paraleloConsumoRows)
    setParaleloPreview('confeccao')
    setParaleloModalOpen(false)
    setMaterialModalOpen(true)
  }

  const handleFecharPreviewAuditoria = () => {
    if (isBatchSending) return
    setImhModalOpen(false)
    setImhConsumoRows([])
    if (paraleloPreview === 'auditoria') {
      setParaleloPreview(null)
      setParaleloModalOpen(true)
    }
  }

  const handleFecharPreviewConfeccao = () => {
    if (isBatchSending) return
    setMaterialModalOpen(false)
    setMaterialConsumoRows([])
    if (paraleloPreview === 'confeccao') {
      setParaleloPreview(null)
      setParaleloModalOpen(true)
    }
  }

  const handleConfirmarEnvioImh = async (planilha: ImhPlanilha) => {
    const clinicaNome = clinicaLogada?.nome ?? ''
    if (!clinicaNome) {
      setBatchError('Clínica não identificada. Faça login novamente.')
      return
    }

    const novos = imhConsumoRows.filter((r) =>
      rowPodeSerEnviadaAuditoria(r, rowIdsComPedido, finalizedAuditoriaRowIds),
    )

    setBatchError(null)
    setIsBatchSending(true)
    try {
      if (novos.length === 0) {
        setBatchError('Nenhum lançamento novo para enviar.')
        return
      }

      const rowIds = novos.map((row) => row.id)
      const pedidoExistente = findPedidoParaMesmasLinhas(pedidos, rowIds, clinicaId)
      const tituloPlanilha = planilha.cabecalho.numeroRelacao?.trim() || undefined
      let pedidoId: string

      if (isMedicamentoPortal) {
        if (pedidoExistente) {
          pedidoId = pedidoExistente.id
        } else {
          pedidoId = createPedidoLoteId()
          await createPedido.mutateAsync({
            ...consumoRowsToPedidoInput(novos, clinicaNome, tituloPlanilha, 'imh'),
            id: pedidoId,
            fluxo: 'imh',
            consumoRowIds: rowIds,
          })
        }
      } else if (pedidoExistente) {
        pedidoId = pedidoExistente.id
        await adicionarFluxo.mutateAsync({ pedidoId, fluxo: 'auditoria' })
      } else {
        pedidoId = createPedidoLoteId()
        await createPedido.mutateAsync({
          ...consumoRowsToPedidoInput(novos, clinicaNome, tituloPlanilha),
          id: pedidoId,
          fluxo: 'auditoria',
          consumoRowIds: rowIds,
        })
      }
      pedidoPlanilhaEnvioService.saveForPedido(pedidoId, planilha)

      const nextFinalizedAuditoria = new Set(finalizedAuditoriaRowIds)
      for (const row of novos) nextFinalizedAuditoria.add(row.id)
      setFinalizedAuditoriaRowIds(nextFinalizedAuditoria)
      setRowSelectionAuditoria((prev) => {
        const next = { ...prev }
        for (const row of novos) delete next[row.id]
        return next
      })
      mergeNovosNasPlanilhas(novos, nextFinalizedAuditoria, finalizedMaterialRowIds)
      consumoPlanilhaService.markRowsFinalizedAuditoria(clinicaId, novos)
      setImhModalOpen(false)
      setImhConsumoRows([])
      navigatePortal(`/clinica/timeline/${pedidoId}`)
    } catch {
      setBatchError('Erro ao enviar lançamentos. Tente novamente.')
    } finally {
      setIsBatchSending(false)
    }
  }

  const handleConfirmarEnvioMaterial = async (planilha: ControleSolempPlanilha) => {
    const clinicaNome = clinicaLogada?.nome ?? ''
    if (!clinicaNome) {
      setBatchError('Clínica não identificada. Faça login novamente.')
      return
    }

    const novos = materialConsumoRows.filter((r) =>
      rowPodeSerEnviadaMaterial(r, finalizedMaterialRowIds),
    )

    setBatchError(null)
    setIsBatchSending(true)
    try {
      if (novos.length === 0) {
        setBatchError('Nenhum lançamento novo para enviar.')
        return
      }

      const rowIds = novos.map((row) => row.id)
      const pedidoExistente = findPedidoParaMesmasLinhas(pedidos, rowIds, clinicaId)
      const tituloPlanilha =
        planilha.linhas[0]?.mesAnoReferencia?.trim() ||
        planilha.linhas[0]?.descricao?.trim() ||
        undefined
      let pedidoId: string

      if (pedidoExistente) {
        pedidoId = pedidoExistente.id
        await adicionarFluxo.mutateAsync({ pedidoId, fluxo: 'confeccao' })
      } else {
        pedidoId = createPedidoLoteId()
        await createPedido.mutateAsync({
          ...consumoRowsToPedidoInput(novos, clinicaNome, tituloPlanilha, 'confeccao'),
          id: pedidoId,
          fluxo: 'confeccao',
          consumoRowIds: rowIds,
        })
      }
      pedidoPlanilhaEnvioService.saveControleSolempForPedido(pedidoId, planilha)

      const nextFinalizedMaterial = new Set(finalizedMaterialRowIds)
      for (const row of novos) nextFinalizedMaterial.add(row.id)
      setFinalizedMaterialRowIds(nextFinalizedMaterial)
      setRowSelectionMaterial((prev) => {
        const next = { ...prev }
        for (const row of novos) delete next[row.id]
        return next
      })
      mergeNovosNasPlanilhas(novos, finalizedAuditoriaRowIds, nextFinalizedMaterial)
      consumoPlanilhaService.markRowsFinalizedMaterial(clinicaId, novos)
      setMaterialModalOpen(false)
      setMaterialConsumoRows([])
      navigatePortal(`/clinica/timeline/${pedidoId}`)
    } catch {
      setBatchError('Erro ao enviar lançamentos para Confecção de Solemp. Tente novamente.')
    } finally {
      setIsBatchSending(false)
    }
  }

  const handleEnviarAmbasParalelo = async () => {
    const clinicaNome = clinicaLogada?.nome ?? ''
    if (!clinicaNome) {
      setBatchError('Clínica não identificada. Faça login novamente.')
      return
    }

    const novos = paraleloConsumoRows.filter(
      (r) =>
        rowPodeSerEnviadaAuditoria(r, rowIdsComPedido, finalizedAuditoriaRowIds) ||
        rowPodeSerEnviadaMaterial(r, finalizedMaterialRowIds),
    )

    setBatchError(null)
    setIsBatchSending(true)
    try {
      if (novos.length === 0) {
        setBatchError('Nenhum lançamento novo para enviar.')
        return
      }

      const rowIds = novos.map((row) => row.id)
      const pedidoExistente = findPedidoParaMesmasLinhas(pedidos, rowIds, clinicaId)
      const planilha = buildImhPlanilhaFromConsumo(novos, mesSelecionado)
      const controleSolemp = buildControleSolempFromConsumo(novos, mesSelecionado)
      const tituloPlanilha = planilha.cabecalho.numeroRelacao?.trim() || undefined
      let pedidoId: string

      if (pedidoExistente) {
        pedidoId = pedidoExistente.id
        await adicionarFluxo.mutateAsync({ pedidoId, fluxo: 'auditoria' })
        await adicionarFluxo.mutateAsync({ pedidoId, fluxo: 'confeccao' })
      } else {
        pedidoId = createPedidoLoteId()
        await createPedido.mutateAsync({
          ...consumoRowsToPedidoInput(novos, clinicaNome, tituloPlanilha, 'auditoria'),
          id: pedidoId,
          fluxo: 'paralelo',
          consumoRowIds: rowIds,
        })
      }
      pedidoPlanilhaEnvioService.saveForPedido(pedidoId, planilha)
      pedidoPlanilhaEnvioService.saveControleSolempForPedido(pedidoId, controleSolemp)

      const nextFinalizedAuditoria = new Set(finalizedAuditoriaRowIds)
      const nextFinalizedMaterial = new Set(finalizedMaterialRowIds)
      for (const row of novos) {
        nextFinalizedAuditoria.add(row.id)
        nextFinalizedMaterial.add(row.id)
      }
      setFinalizedAuditoriaRowIds(nextFinalizedAuditoria)
      setFinalizedMaterialRowIds(nextFinalizedMaterial)
      setRowSelectionAuditoria((prev) => {
        const next = { ...prev }
        for (const row of novos) delete next[row.id]
        return next
      })
      setRowSelectionMaterial((prev) => {
        const next = { ...prev }
        for (const row of novos) delete next[row.id]
        return next
      })
      mergeNovosNasPlanilhas(novos, nextFinalizedAuditoria, nextFinalizedMaterial)
      consumoPlanilhaService.markRowsFinalizedAuditoria(clinicaId, novos)
      consumoPlanilhaService.markRowsFinalizedMaterial(clinicaId, novos)
      setParaleloModalOpen(false)
      setParaleloConsumoRows([])
      setParaleloPreview(null)
      navigatePortal(`/clinica/timeline/${pedidoId}`)
    } catch {
      setBatchError('Erro ao enviar lançamentos para Confecção Solemp/Auditoria. Tente novamente.')
    } finally {
      setIsBatchSending(false)
    }
  }

  return (
    <>
      <Box sx={{ mb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
            onClick={() => navigatePortal('/clinica/pedidos')}
            sx={{ minWidth: 0, px: 1, py: 0.25, flexShrink: 0 }}
          >
            Voltar
          </Button>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Novo Lançamento
          </Typography>
        </Box>

        <Tabs
          value={abaAtiva}
          onChange={(_: SyntheticEvent, v: number) => setAbaAtiva(v)}
          sx={{
            minHeight: 36,
            '& .MuiTabs-indicator': { height: 2 },
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0.5,
              px: 1.25,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem',
              gap: 0.5,
            },
          }}
        >
          <Tab label="Novo lançamento" />
          <Tab
            icon={<GridOnIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label="Consumo Material Consignado"
          />
        </Tabs>
      </Box>

      {batchError && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setBatchError(null)}>
          {batchError}
        </Alert>
      )}

      {abaAtiva === 1 && (
        <ConsumoMaterialConsignadoView
          lancamentos={activeLancamentos}
          fileName={
            isDemoMedicamentoFixo
              ? 'Modelo IHM — PME (demonstração)'
              : activeFileName
          }
          rowSelectionAuditoria={rowSelectionAuditoria}
          onRowSelectionAuditoriaChange={handleRowSelectionAuditoriaChange}
          rowSelectionMaterial={rowSelectionMaterial}
          onRowSelectionMaterialChange={handleRowSelectionMaterialChange}
          rowIdsComPedido={rowIdsComPedido}
          finalizedAuditoriaRowIds={finalizedAuditoriaRowIds}
          finalizedMaterialRowIds={finalizedMaterialRowIds}
          totalPedidos={pedidos.length}
          mesSelecionado={activeMesSelecionado}
          onMesSelecionadoChange={
            isDemoMedicamentoFixo ? undefined : handleMesSelecionadoChange
          }
          onExcluirTudo={isDemoMedicamentoFixo ? undefined : handleExcluirTudo}
          onAdicionarPlanilha={isDemoMedicamentoFixo ? undefined : handleAdicionarPlanilha}
          isExcluindo={deleteAllPedidos.isPending}
          isAdicionando={isAdicionandoPlanilha}
          addPlanilhaError={addPlanilhaError}
          onAddPlanilhaErrorClear={() => setAddPlanilhaError(null)}
          onLimparRascunho={isDemoMedicamentoFixo ? undefined : limparPlanilha}
          onEnviarImh={isMedicamentoPortal ? handleAbrirImhModal : undefined}
          onEnviarParalelo={isMedicamentoPortal ? undefined : handleAbrirParaleloModal}
          modoMedicamento={isMedicamentoPortal}
          planilhaFixaDemo={isDemoMedicamentoFixo}
          isEnviando={isBatchSending}
          rowsByMes={isDemoMedicamentoFixo ? undefined : activeRowsByMes}
          onRowsChange={isDemoMedicamentoFixo ? undefined : handleMesRowsChange}
          onExcluirLinhaRow={isDemoMedicamentoFixo ? undefined : handleExcluirLinhaRow}
          onDesfinalizarLinha={handleDesfinalizarLinha}
          planilhaAbas={isDemoMedicamentoFixo ? undefined : planilhaAbas}
          abaPlanilhaAtivaId={abaPlanilhaAtivaId}
          onAbaPlanilhaChange={
            isDemoMedicamentoFixo ? undefined : handleAbaPlanilhaChange
          }
          onFecharAbaPlanilha={
            isDemoMedicamentoFixo ? undefined : handleFecharAbaPlanilha
          }
        />
      )}

      <ClinicaEnvioParaleloModal
        open={paraleloModalOpen}
        rows={paraleloConsumoRows}
        isSubmitting={isBatchSending}
        onClose={() => {
          if (!isBatchSending) {
            setParaleloModalOpen(false)
            setParaleloConsumoRows([])
            setParaleloPreview(null)
          }
        }}
        onVisualizarAuditoria={handleVisualizarAuditoriaParalelo}
        onVisualizarConfeccao={handleVisualizarConfeccaoParalelo}
        onEnviarAmbas={handleEnviarAmbasParalelo}
      />

      <ImhEnvioModal
        open={imhModalOpen}
        consumoRows={imhConsumoRows}
        mesReferencia={activeMesSelecionado}
        isSubmitting={isBatchSending}
        modoMedicamento={isMedicamentoPortal}
        previewOnly={paraleloPreview === 'auditoria'}
        onClose={
          paraleloPreview === 'auditoria'
            ? handleFecharPreviewAuditoria
            : () => {
                if (!isBatchSending) {
                  setImhModalOpen(false)
                  setImhConsumoRows([])
                }
              }
        }
        onConfirm={handleConfirmarEnvioImh}
      />

      <MaterialEnvioModal
        open={materialModalOpen}
        consumoRows={materialConsumoRows}
        mesReferencia={activeMesSelecionado}
        isSubmitting={isBatchSending}
        previewOnly={paraleloPreview === 'confeccao'}
        onClose={
          paraleloPreview === 'confeccao'
            ? handleFecharPreviewConfeccao
            : () => {
                if (!isBatchSending) {
                  setMaterialModalOpen(false)
                  setMaterialConsumoRows([])
                }
              }
        }
        onConfirm={handleConfirmarEnvioMaterial}
      />
    </>
  )
}
