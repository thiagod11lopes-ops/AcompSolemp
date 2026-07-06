import {
  Box,
  Button,
  Tab,
  Tabs,
  Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import TableChartIcon from '@mui/icons-material/TableChart'
import EditNoteIcon from '@mui/icons-material/EditNote'
import GridOnIcon from '@mui/icons-material/GridOn'
import SendIcon from '@mui/icons-material/Send'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useCallback, useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RowSelectionState } from '@tanstack/react-table'
import { PageHeader } from '@/components/common/PageHeader'
import { ConsumoMaterialConsignadoView } from '@/components/clinica/ConsumoMaterialConsignadoView'
import { ConsumoMaterialManualForm } from '@/components/clinica/ConsumoMaterialManualForm'
import { OdsUploadZone } from '@/components/clinica/OdsUploadZone'
import { useCreateClinicaPedido } from '@/hooks/useClinicaPedidos'
import { useClinicas } from '@/hooks/useCadastros'
import { useClinicaAuth } from '@/contexts/AuthContext'
import {
  consumoRowToPedidoInput,
  parseConsumoMaterialOds,
  type ConsumoMaterialRow,
} from '@/utils/consumoMaterialOds'
import { isLinhaPreenchida, getConsumoMaterialInicial, CONSUMO_PLANILHA_NOME_PADRAO } from '@/utils/consumoMaterialTemplate'

function PlanilhaToolbar({
  onClear,
  onSend,
  selectedCount,
  isSending,
  clearLabel,
  disabled = false,
}: {
  onClear: () => void
  onSend: () => void
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
        onClick={onSend}
        disabled={isSending || selectedCount === 0}
      >
        {isSending ? 'Enviando...' : `Enviar selecionados (${selectedCount})`}
      </Button>
    </Box>
  )
}

export default function ClinicaNovoPedidoPage() {
  const navigate = useNavigate()
  const createPedido = useCreateClinicaPedido()
  const { user } = useClinicaAuth()
  const { data: clinicas = [] } = useClinicas()
  const clinicaLogada = clinicas.find((c) => c.id === user?.clinicaId)

  const [abaAtiva, setAbaAtiva] = useState(0)
  const [planilhaRows, setPlanilhaRows] = useState<ConsumoMaterialRow[]>(getConsumoMaterialInicial)
  const [planilhaNome, setPlanilhaNome] = useState(CONSUMO_PLANILHA_NOME_PADRAO)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [batchError, setBatchError] = useState<string | null>(null)
  const [isBatchSending, setIsBatchSending] = useState(false)

  const handleOdsFile = useCallback(async (file: File) => {
    setParseError(null)
    setIsParsing(true)
    setRowSelection({})
    try {
      const rows = await parseConsumoMaterialOds(file)
      setPlanilhaRows(rows)
      setPlanilhaNome(file.name)
      const initialSelection: RowSelectionState = {}
      rows.slice(0, Math.min(rows.length, 50)).forEach((r) => {
        initialSelection[r.id] = true
      })
      setRowSelection(initialSelection)
      setAbaAtiva(2)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erro ao ler o arquivo ODS')
    } finally {
      setIsParsing(false)
    }
  }, [])

  const limparPlanilha = () => {
    setPlanilhaRows(getConsumoMaterialInicial())
    setPlanilhaNome(CONSUMO_PLANILHA_NOME_PADRAO)
    setRowSelection({})
    setParseError(null)
    setBatchError(null)
  }

  const handleAddManualRow = (row: ConsumoMaterialRow) => {
    setPlanilhaRows((prev) => [...prev, row])
    setRowSelection((prev) => ({ ...prev, [row.id]: true }))
    setBatchError(null)
    setAbaAtiva(2)
  }

  const handleEnviarSelecionados = async () => {
    const clinicaNome = clinicaLogada?.nome ?? ''
    if (!clinicaNome) {
      setBatchError('Clínica não identificada. Faça login novamente.')
      return
    }

    const selectedRows = planilhaRows.filter(
      (r) => rowSelection[r.id] && isLinhaPreenchida(r),
    )
    if (selectedRows.length === 0) {
      setBatchError('Selecione ao menos um lançamento na planilha.')
      return
    }

    setBatchError(null)
    setIsBatchSending(true)
    try {
      let ultimoId: string | null = null
      for (const row of selectedRows) {
        const pedido = await createPedido.mutateAsync(
          consumoRowToPedidoInput(row, clinicaNome),
        )
        ultimoId = pedido.id
      }
      if (selectedRows.length === 1 && ultimoId) {
        navigate(`/clinica/timeline/${ultimoId}`)
      } else {
        navigate('/clinica/pedidos')
      }
    } catch {
      setBatchError('Erro ao enviar lançamentos. Tente novamente.')
    } finally {
      setIsBatchSending(false)
    }
  }

  const selectedCount = planilhaRows.filter(
    (r) => rowSelection[r.id] && isLinhaPreenchida(r),
  ).length
  const exibirPlanilha = true

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
        subtitle="Importe a planilha (.ods), adicione lançamentos manuais ou revise na aba Consumo Material Consignado"
      />

      <Tabs
        value={abaAtiva}
        onChange={(_: SyntheticEvent, v: number) => setAbaAtiva(v)}
        sx={{ mb: 3 }}
      >
        <Tab icon={<TableChartIcon />} iconPosition="start" label="Importar planilha (.ods)" />
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
        <Box sx={{ display: 'grid', gap: 3 }}>
          <OdsUploadZone onFile={handleOdsFile} isLoading={isParsing} error={parseError} />
          {exibirPlanilha && (
            <Alert severity="info">
              Planilha carregada com{' '}
              <strong>{planilhaRows.filter(isLinhaPreenchida).length}</strong> lançamento(s).
              Acesse a aba <strong>Consumo Material Consignado</strong> para revisar e enviar.
            </Alert>
          )}
        </Box>
      )}

      {abaAtiva === 1 && (
        <ConsumoMaterialManualForm
          nextNumero={String(planilhaRows.length + 1)}
          onAddRow={handleAddManualRow}
        />
      )}

      {abaAtiva === 2 && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          <PlanilhaToolbar
            onClear={limparPlanilha}
            onSend={handleEnviarSelecionados}
            selectedCount={selectedCount}
            isSending={isBatchSending}
                clearLabel="Restaurar modelos"
                disabled={false}
          />
          <ConsumoMaterialConsignadoView
            lancamentos={planilhaRows}
            fileName={planilhaNome || 'Consumo Material Consignado'}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        </Box>
      )}
    </>
  )
}
