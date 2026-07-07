import {
  Box,
  Button,
  Tab,
  Tabs,
  Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditNoteIcon from '@mui/icons-material/EditNote'
import GridOnIcon from '@mui/icons-material/GridOn'
import SendIcon from '@mui/icons-material/Send'
import InventoryIcon from '@mui/icons-material/Inventory'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useMemo, useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RowSelectionState } from '@tanstack/react-table'
import { PageHeader } from '@/components/common/PageHeader'
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
  type MesConsumoModelo,
} from '@/utils/consumoMaterialTemplate'

function PlanilhaToolbar({
  onClear,
  onSendImh,
  onSendMaterial,
  selectedCount,
  isSending,
  clearLabel,
  disabled = false,
}: {
  onClear: () => void
  onSendImh: () => void
  onSendMaterial: () => void
  selectedCount: number
  isSending: boolean
  clearLabel: string
  disabled?: boolean
}) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={onClear}
        disabled={isSending || disabled}
      >
        {clearLabel}
      </Button>
      <Button
        variant="contained"
        size="large"
        startIcon={<SendIcon />}
        onClick={onSendImh}
        disabled={isSending || selectedCount === 0}
      >
        {isSending ? 'Enviando para IMH...' : `Enviar para IMH (${selectedCount})`}
      </Button>
      <Button
        variant="contained"
        size="large"
        color="secondary"
        startIcon={<InventoryIcon />}
        onClick={onSendMaterial}
        disabled={isSending || selectedCount === 0}
      >
        Enviar para o Material ({selectedCount})
      </Button>
    </Box>
  )
}

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

  const rowIdsComPedido = useMemo(() => getRowIdsComPedido(pedidos), [pedidos])

  const planilhaRows = useMemo(
    () => buildPlanilhaLancamentos(pedidos, extraRows),
    [pedidos, extraRows],
  )

  const limparPlanilha = () => {
    setExtraRows([])
    setPlanilhaNome(CONSUMO_PLANILHA_NOME_PADRAO)
    setRowSelection({})
    setBatchError(null)
  }

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

  const selectedCount = planilhaRows.filter(
    (r) => rowSelection[r.id] && rowPodeSerSelecionada(r),
  ).length

  const totalPreenchidos = planilhaRows.filter(isLinhaPreenchida).length

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/clinica/pedidos')}
        sx={{ mb: 2 }}
      >
        Voltar
      </Button>

      <PageHeader
        title="Novo Lançamento"
        subtitle="Adicione lançamentos manuais ou revise na aba Consumo Material Consignado"
      />

      <Tabs
        value={abaAtiva}
        onChange={(_: SyntheticEvent, v: number) => setAbaAtiva(v)}
        sx={{ mb: 3 }}
      >
        <Tab icon={<EditNoteIcon />} iconPosition="start" label="Lançamento manual" />
        <Tab
          icon={<GridOnIcon />}
          iconPosition="start"
          label="Consumo Material Consignado"
        />
      </Tabs>

      {batchError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBatchError(null)}>
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
        <Box sx={{ display: 'grid', gap: 3 }}>
          <PlanilhaToolbar
            onClear={limparPlanilha}
            onSendImh={handleAbrirImhModal}
            onSendMaterial={handleAbrirMaterialModal}
            selectedCount={selectedCount}
            isSending={isBatchSending}
            clearLabel="Limpar rascunhos"
          />
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
          />
        </Box>
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
