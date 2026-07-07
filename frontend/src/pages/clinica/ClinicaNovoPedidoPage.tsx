import {
  Box,
  Button,
  Tab,
  Tabs,
  Alert,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditNoteIcon from '@mui/icons-material/EditNote'
import GridOnIcon from '@mui/icons-material/GridOn'
import { useMemo, useState, useCallback, useRef, useEffect, type SyntheticEvent } from 'react'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import type { RowSelectionState } from '@tanstack/react-table'
import { ConsumoMaterialConsignadoView } from '@/components/clinica/ConsumoMaterialConsignadoView'
import { ConsumoMaterialManualForm } from '@/components/clinica/ConsumoMaterialManualForm'
import { ImhEnvioModal } from '@/components/clinica/ImhEnvioModal'
import { MaterialEnvioModal } from '@/components/clinica/MaterialEnvioModal'
import {
  useCreateClinicaPedido,
  useAdicionarFluxoParalelo,
  useClinicaPedidos,
  useDeleteAllClinicaPedidos,
  useConsumoPlanilhaState,
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
  rowPodeSerEnviadaAuditoria,
  rowPodeSerEnviadaMaterial,
  getMesAtualModelo,
  getMesModeloFromParts,
  dataPertenceAoMes,
  syncExtraRowsFromMesSheet,
  inicializarLinhasDoMes,
  type MesConsumoModelo,
} from '@/utils/consumoMaterialTemplate'
import { consumoPlanilhaService } from '@/services/consumoPlanilhaService'
import { pedidoPlanilhaEnvioService } from '@/services/pedidoPlanilhaEnvioService'
import { loadAppData } from '@/mocks/seed'
import type { ImhPlanilha } from '@/utils/imhPlanilhaTemplate'
import type { ConsumoEnvioCanal } from '@/components/clinica/ConsumoMaterialSpreadsheet'

export default function ClinicaNovoPedidoPage() {
  const { navigatePortal } = usePortalPaths()
  const createPedido = useCreateClinicaPedido()
  const adicionarFluxo = useAdicionarFluxoParalelo()
  const deleteAllPedidos = useDeleteAllClinicaPedidos()
  const { user } = useClinicaAuth()
  const clinicaId = user?.clinicaId ?? ''
  const { data: pedidos = [] } = useClinicaPedidos()
  const { data: planilhaPersistida } = useConsumoPlanilhaState(clinicaId)
  const { data: clinicas = [] } = useClinicas()
  const clinicaLogada = clinicas.find((c) => c.id === user?.clinicaId)

  const [abaAtiva, setAbaAtiva] = useState(1)
  const [extraRows, setExtraRows] = useState<ConsumoMaterialRow[]>([])
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
  const [rowsByMes, setRowsByMes] = useState<Record<string, ConsumoMaterialRow[]>>({})
  const [deletedRowIds, setDeletedRowIds] = useState<Set<string>>(new Set())
  const [finalizedAuditoriaRowIds, setFinalizedAuditoriaRowIds] = useState<Set<string>>(new Set())
  const [finalizedMaterialRowIds, setFinalizedMaterialRowIds] = useState<Set<string>>(new Set())
  const extraRowsSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const planilhaHydrated = useRef(false)

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
    if (!clinicaId || !planilhaPersistida || planilhaHydrated.current) return
    planilhaHydrated.current = true
    if (planilhaPersistida.extraRows.length > 0) {
      setExtraRows(planilhaPersistida.extraRows)
    }
    if (planilhaPersistida.finalizedAuditoriaRowIds?.length || planilhaPersistida.finalizedRowIds.length > 0) {
      const finalizedAuditoria = new Set(
        planilhaPersistida.finalizedAuditoriaRowIds ?? planilhaPersistida.finalizedRowIds,
      )
      setFinalizedAuditoriaRowIds(finalizedAuditoria)
      setRowSelectionAuditoria((prev) => {
        const next = { ...prev }
        for (const rowId of finalizedAuditoria) next[rowId] = true
        return next
      })
    }
    if (planilhaPersistida.finalizedMaterialRowIds?.length) {
      const finalizedMaterial = new Set(planilhaPersistida.finalizedMaterialRowIds)
      setFinalizedMaterialRowIds(finalizedMaterial)
      setRowSelectionMaterial((prev) => {
        const next = { ...prev }
        for (const rowId of finalizedMaterial) next[rowId] = true
        return next
      })
    }
  }, [clinicaId, planilhaPersistida])

  const persistPlanilhaState = useCallback(
    (
      nextExtraRows: ConsumoMaterialRow[],
      nextFinalizedAuditoria: Set<string>,
      nextFinalizedMaterial: Set<string>,
    ) => {
      if (!clinicaId) return
      consumoPlanilhaService.saveState(clinicaId, {
        finalizedRowIds: [...nextFinalizedAuditoria],
        finalizedAuditoriaRowIds: [...nextFinalizedAuditoria],
        finalizedMaterialRowIds: [...nextFinalizedMaterial],
        extraRows: nextExtraRows,
      })
    },
    [clinicaId],
  )

  const planilhaRows = useMemo(
    () => buildPlanilhaLancamentos(pedidos, extraRows, deletedRowIds),
    [pedidos, extraRows, deletedRowIds],
  )

  const limparPlanilha = () => {
    setExtraRows([])
    setRowsByMes({})
    setDeletedRowIds(new Set())
    setFinalizedAuditoriaRowIds(new Set())
    setFinalizedMaterialRowIds(new Set())
    setPlanilhaNome(CONSUMO_PLANILHA_NOME_PADRAO)
    setRowSelectionAuditoria({})
    setRowSelectionMaterial({})
    setBatchError(null)
    if (clinicaId) consumoPlanilhaService.clearState(clinicaId)
  }

  const handleRowSelectionAuditoriaChange = useCallback(
    (selection: RowSelectionState) => {
      const next = { ...selection }
      for (const rowId of finalizedAuditoriaRowIds) {
        next[rowId] = true
      }
      setRowSelectionAuditoria(next)
    },
    [finalizedAuditoriaRowIds],
  )

  const handleRowSelectionMaterialChange = useCallback(
    (selection: RowSelectionState) => {
      const next = { ...selection }
      for (const rowId of finalizedMaterialRowIds) {
        next[rowId] = true
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

  const handleAdicionarPlanilha = async (mes: number, ano: number, file: File) => {
    setAddPlanilhaError(null)
    setIsAdicionandoPlanilha(true)
    try {
      const rows = await parseConsumoMaterialFile(file)
      const mesModelo = getMesModeloFromParts(mes, ano)
      const novos = rows.filter(
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
      setExtraRows((prev) => {
        const semMes = prev.filter((r) => !dataPertenceAoMes(r.data, mesModelo))
        const ids = new Set(semMes.map((r) => r.id))
        const merged = [...semMes]
        for (const row of novos) {
          if (!ids.has(row.id)) merged.push(row)
        }
        return merged
      })
      setPlanilhaNome(file.name)
      setMesSelecionado(mesModelo)
      setRowsByMes((prev) => {
        const next = { ...prev }
        delete next[mesModelo.id]
        return next
      })
      const initialSelection: RowSelectionState = {}
      novos.slice(0, Math.min(novos.length, 50)).forEach((r) => {
        initialSelection[r.id] = true
      })
      setRowSelectionAuditoria(initialSelection)
    } catch (err) {
      if (err instanceof Error && err.message !== 'no rows') {
        setAddPlanilhaError(err.message || 'Erro ao ler o arquivo ODS')
      }
      throw err
    } finally {
      setIsAdicionandoPlanilha(false)
    }
  }

  const handleAddManualRow = (row: ConsumoMaterialRow) => {
    setExtraRows((prev) => [...prev, row])
    setRowSelectionAuditoria((prev) => ({ ...prev, [row.id]: true }))
    setBatchError(null)
    setAbaAtiva(1)
  }

  const getSelectedRowsAuditoria = useCallback(() => {
    const mesSheet = rowsByMes[mesSelecionado.id]
    const sourceRows = mesSheet ?? inicializarLinhasDoMes(planilhaRows, mesSelecionado)
    return sourceRows.filter(
      (r) =>
        rowSelectionAuditoria[r.id] &&
        rowPodeSerEnviadaAuditoria(r, rowIdsComPedido, finalizedAuditoriaRowIds),
    )
  }, [
    rowsByMes,
    mesSelecionado,
    planilhaRows,
    rowSelectionAuditoria,
    rowIdsComPedido,
    finalizedAuditoriaRowIds,
  ])

  const getSelectedRowsMaterial = useCallback(() => {
    const mesSheet = rowsByMes[mesSelecionado.id]
    const sourceRows = mesSheet ?? inicializarLinhasDoMes(planilhaRows, mesSelecionado)
    return sourceRows.filter(
      (r) =>
        rowSelectionMaterial[r.id] &&
        rowPodeSerEnviadaMaterial(r, finalizedMaterialRowIds),
    )
  }, [
    rowsByMes,
    mesSelecionado,
    planilhaRows,
    rowSelectionMaterial,
    finalizedMaterialRowIds,
  ])

  const handleAbrirImhModal = () => {
    const selectedRows = getSelectedRowsAuditoria()
    if (selectedRows.length === 0) {
      setBatchError('Selecione lançamentos novos preenchidos para enviar.')
      return
    }
    setBatchError(null)
    setImhConsumoRows(selectedRows)
    setImhModalOpen(true)
  }

  const handleAbrirMaterialModal = () => {
    const selectedRows = getSelectedRowsMaterial()
    if (selectedRows.length === 0) {
      setBatchError('Selecione lançamentos novos preenchidos para enviar.')
      return
    }
    setBatchError(null)
    setMaterialConsumoRows(selectedRows)
    setMaterialModalOpen(true)
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

      if (pedidoExistente) {
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
        for (const row of novos) next[row.id] = true
        return next
      })
      setExtraRows((prev) => {
        const merged = [...prev]
        for (const row of novos) {
          const index = merged.findIndex((item) => item.id === row.id)
          if (index >= 0) merged[index] = row
          else merged.push(row)
        }
        persistPlanilhaState(merged, nextFinalizedAuditoria, finalizedMaterialRowIds)
        return merged
      })
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

  const handleConfirmarEnvioMaterial = async (planilha: ImhPlanilha) => {
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
      const tituloPlanilha = planilha.cabecalho.numeroRelacao?.trim() || undefined
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
      pedidoPlanilhaEnvioService.saveForPedido(pedidoId, planilha)

      const nextFinalizedMaterial = new Set(finalizedMaterialRowIds)
      for (const row of novos) nextFinalizedMaterial.add(row.id)
      setFinalizedMaterialRowIds(nextFinalizedMaterial)
      setRowSelectionMaterial((prev) => {
        const next = { ...prev }
        for (const row of novos) next[row.id] = true
        return next
      })
      setExtraRows((prev) => {
        const merged = [...prev]
        for (const row of novos) {
          const index = merged.findIndex((item) => item.id === row.id)
          if (index >= 0) merged[index] = row
          else merged.push(row)
        }
        persistPlanilhaState(merged, finalizedAuditoriaRowIds, nextFinalizedMaterial)
        return merged
      })
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

  const totalPreenchidos = useMemo(
    () => planilhaRows.filter(isLinhaPreenchida).length,
    [planilhaRows],
  )

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
          <Tab
            icon={<EditNoteIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label="Lançamento manual"
          />
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

      {abaAtiva === 0 && (
        <ConsumoMaterialManualForm
          nextNumero={String(totalPreenchidos + 1)}
          onAddRow={handleAddManualRow}
        />
      )}

      {abaAtiva === 1 && (
        <ConsumoMaterialConsignadoView
          lancamentos={planilhaRows}
          fileName={planilhaNome || 'Consumo Material Consignado'}
          rowSelectionAuditoria={rowSelectionAuditoria}
          onRowSelectionAuditoriaChange={handleRowSelectionAuditoriaChange}
          rowSelectionMaterial={rowSelectionMaterial}
          onRowSelectionMaterialChange={handleRowSelectionMaterialChange}
          rowIdsComPedido={rowIdsComPedido}
          finalizedAuditoriaRowIds={finalizedAuditoriaRowIds}
          finalizedMaterialRowIds={finalizedMaterialRowIds}
          totalPedidos={pedidos.length}
          mesSelecionado={mesSelecionado}
          onMesSelecionadoChange={setMesSelecionado}
          onExcluirTudo={handleExcluirTudo}
          onAdicionarPlanilha={handleAdicionarPlanilha}
          isExcluindo={deleteAllPedidos.isPending}
          isAdicionando={isAdicionandoPlanilha}
          addPlanilhaError={addPlanilhaError}
          onAddPlanilhaErrorClear={() => setAddPlanilhaError(null)}
          onLimparRascunho={limparPlanilha}
          onEnviarImh={handleAbrirImhModal}
          onEnviarMaterial={handleAbrirMaterialModal}
          isEnviando={isBatchSending}
          rowsByMes={rowsByMes[mesSelecionado.id]}
          onRowsChange={handleMesRowsChange}
          onExcluirLinhaRow={handleExcluirLinhaRow}
          onDesfinalizarLinha={handleDesfinalizarLinha}
        />
      )}

      <ImhEnvioModal
        open={imhModalOpen}
        consumoRows={imhConsumoRows}
        mesReferencia={mesSelecionado}
        isSubmitting={isBatchSending}
        onClose={() => {
          if (!isBatchSending) {
            setImhModalOpen(false)
            setImhConsumoRows([])
          }
        }}
        onConfirm={handleConfirmarEnvioImh}
      />

      <MaterialEnvioModal
        open={materialModalOpen}
        consumoRows={materialConsumoRows}
        mesReferencia={mesSelecionado}
        isSubmitting={isBatchSending}
        onClose={() => {
          if (!isBatchSending) {
            setMaterialModalOpen(false)
            setMaterialConsumoRows([])
          }
        }}
        onConfirm={handleConfirmarEnvioMaterial}
      />
    </>
  )
}
