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
import { useMemo, useState, useCallback, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RowSelectionState } from '@tanstack/react-table'
import { ConsumoMaterialConsignadoView } from '@/components/clinica/ConsumoMaterialConsignadoView'
import { ConsumoMaterialManualForm } from '@/components/clinica/ConsumoMaterialManualForm'
import { ImhEnvioModal } from '@/components/clinica/ImhEnvioModal'
import { MaterialEnvioModal } from '@/components/clinica/MaterialEnvioModal'
import { useCreateClinicaPedido, useClinicaPedidos, useDeleteAllClinicaPedidos } from '@/hooks/useClinicaPedidos'
import { useClinicas } from '@/hooks/useCadastros'
import { useClinicaAuth } from '@/contexts/AuthContext'
import {
  consumoRowToPedidoInput,
  parseConsumoMaterialOds,
  type ConsumoMaterialRow,
} from '@/utils/consumoMaterialOds'
import {
  isLinhaPreenchida,
  buildPlanilhaLancamentos,
  getRowIdsComPedido,
  pedidoIdFromRowId,
  CONSUMO_PLANILHA_NOME_PADRAO,
  rowPodeSerEnviada,
  rowPodeSerSelecionada,
  getMesAtualModelo,
  getMesModeloFromParts,
  dataPertenceAoMes,
  syncExtraRowsFromMesSheet,
  type MesConsumoModelo,
} from '@/utils/consumoMaterialTemplate'

export default function ClinicaNovoPedidoPage() {
  const navigate = useNavigate()
  const createPedido = useCreateClinicaPedido()
  const deleteAllPedidos = useDeleteAllClinicaPedidos()
  const { user } = useClinicaAuth()
  const { data: pedidos = [] } = useClinicaPedidos()
  const { data: clinicas = [] } = useClinicas()
  const clinicaLogada = clinicas.find((c) => c.id === user?.clinicaId)

  const [abaAtiva, setAbaAtiva] = useState(1)
  const [extraRows, setExtraRows] = useState<ConsumoMaterialRow[]>([])
  const [planilhaNome, setPlanilhaNome] = useState(CONSUMO_PLANILHA_NOME_PADRAO)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
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

  const rowIdsComPedido = useMemo(() => getRowIdsComPedido(pedidos), [pedidos])

  const planilhaRows = useMemo(
    () => buildPlanilhaLancamentos(pedidos, extraRows, deletedRowIds),
    [pedidos, extraRows, deletedRowIds],
  )

  const limparPlanilha = () => {
    setExtraRows([])
    setRowsByMes({})
    setDeletedRowIds(new Set())
    setPlanilhaNome(CONSUMO_PLANILHA_NOME_PADRAO)
    setRowSelection({})
    setBatchError(null)
  }

  const handleMesRowsChange = useCallback(
    (rows: ConsumoMaterialRow[], mes: MesConsumoModelo) => {
      setRowsByMes((prev) => ({ ...prev, [mes.id]: rows }))
      setExtraRows((prev) =>
        syncExtraRowsFromMesSheet(prev, rows, mes, getRowIdsComPedido(pedidos)),
      )
    },
    [pedidos],
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
      const rows = await parseConsumoMaterialOds(file)
      const mesModelo = getMesModeloFromParts(mes, ano)
      const pedidoIds = new Set(pedidos.map((p) => p.id))
      const novos = rows.filter(
        (r) =>
          dataPertenceAoMes(r.data, mesModelo) &&
          !pedidoIds.has(pedidoIdFromRowId(r.id)),
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
      setRowSelection(initialSelection)
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
    setRowSelection((prev) => ({ ...prev, [row.id]: true }))
    setBatchError(null)
    setAbaAtiva(1)
  }

  const getSelectedRows = () =>
    planilhaRows.filter((r) => rowSelection[r.id] && rowPodeSerSelecionada(r))

  const handleAbrirImhModal = () => {
    const selectedRows = getSelectedRows()
    if (selectedRows.length === 0) {
      setBatchError('Selecione lançamentos preenchidos para enviar.')
      return
    }
    setBatchError(null)
    setImhConsumoRows(selectedRows)
    setImhModalOpen(true)
  }

  const handleAbrirMaterialModal = () => {
    const selectedRows = getSelectedRows()
    if (selectedRows.length === 0) {
      setBatchError('Selecione lançamentos preenchidos para enviar.')
      return
    }
    setBatchError(null)
    setMaterialConsumoRows(selectedRows)
    setMaterialModalOpen(true)
  }

  const handleConfirmarEnvioImh = async () => {
    const clinicaNome = clinicaLogada?.nome ?? ''
    if (!clinicaNome) {
      setBatchError('Clínica não identificada. Faça login novamente.')
      return
    }

    const novos = imhConsumoRows.filter((r) => rowPodeSerEnviada(r, rowIdsComPedido))

    setBatchError(null)
    setIsBatchSending(true)
    try {
      let ultimoId: string | null = null
      const enviadosIds = new Set<string>()
      for (const row of novos) {
        const pedido = await createPedido.mutateAsync(
          consumoRowToPedidoInput(row, clinicaNome),
        )
        ultimoId = pedido.id
        enviadosIds.add(row.id)
      }
      if (enviadosIds.size > 0) {
        setExtraRows((prev) => prev.filter((r) => !enviadosIds.has(r.id)))
      }
      setImhModalOpen(false)
      setRowSelection({})
      setImhConsumoRows([])
      if (novos.length === 1 && ultimoId) {
        navigate(`/clinica/timeline/${ultimoId}`)
      } else if (novos.length > 0) {
        navigate('/clinica/pedidos')
      }
    } catch {
      setBatchError('Erro ao enviar lançamentos. Tente novamente.')
    } finally {
      setIsBatchSending(false)
    }
  }

  const totalPreenchidos = planilhaRows.filter(isLinhaPreenchida).length

  return (
    <>
      <Box sx={{ mb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon sx={{ fontSize: 18 }} />}
            onClick={() => navigate('/clinica/pedidos')}
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
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          rowIdsComPedido={rowIdsComPedido}
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
        onClose={() => {
          setMaterialModalOpen(false)
          setMaterialConsumoRows([])
        }}
      />
    </>
  )
}
