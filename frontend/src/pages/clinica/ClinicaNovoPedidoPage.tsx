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
import SendIcon from '@mui/icons-material/Send'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useCallback, useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RowSelectionState } from '@tanstack/react-table'
import { PageHeader } from '@/components/common/PageHeader'
import { ConsumoMaterialSpreadsheet } from '@/components/clinica/ConsumoMaterialSpreadsheet'
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

function PlanilhaToolbar({
  onClear,
  onSend,
  selectedCount,
  isSending,
  clearLabel,
}: {
  onClear: () => void
  onSend: () => void
  selectedCount: number
  isSending: boolean
  clearLabel: string
}) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={onClear}
        disabled={isSending}
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
  const [planilhaRows, setPlanilhaRows] = useState<ConsumoMaterialRow[]>([])
  const [planilhaNome, setPlanilhaNome] = useState('')
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
    } catch (err) {
      setPlanilhaRows([])
      setPlanilhaNome('')
      setParseError(err instanceof Error ? err.message : 'Erro ao ler o arquivo ODS')
    } finally {
      setIsParsing(false)
    }
  }, [])

  const limparPlanilha = () => {
    setPlanilhaRows([])
    setPlanilhaNome('')
    setRowSelection({})
    setParseError(null)
    setBatchError(null)
  }

  const handleAddManualRow = (row: ConsumoMaterialRow) => {
    setPlanilhaRows((prev) => [...prev, row])
    if (!planilhaNome) setPlanilhaNome('Lançamento manual')
    setRowSelection((prev) => ({ ...prev, [row.id]: true }))
    setBatchError(null)
  }

  const handleEnviarSelecionados = async () => {
    const clinicaNome = clinicaLogada?.nome ?? ''
    if (!clinicaNome) {
      setBatchError('Clínica não identificada. Faça login novamente.')
      return
    }

    const selectedRows = planilhaRows.filter((r) => rowSelection[r.id])
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

  const selectedCount = Object.keys(rowSelection).length
  const exibirPlanilha = planilhaRows.length > 0

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
        subtitle="Importe a planilha (.ods) ou preencha manualmente todos os campos da tabela de consumo"
      />

      <Tabs
        value={abaAtiva}
        onChange={(_: SyntheticEvent, v: number) => setAbaAtiva(v)}
        sx={{ mb: 3 }}
      >
        <Tab icon={<TableChartIcon />} iconPosition="start" label="Importar planilha (.ods)" />
        <Tab icon={<EditNoteIcon />} iconPosition="start" label="Lançamento manual" />
      </Tabs>

      {batchError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBatchError(null)}>
          {batchError}
        </Alert>
      )}

      {abaAtiva === 0 && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          {!exibirPlanilha ? (
            <OdsUploadZone onFile={handleOdsFile} isLoading={isParsing} error={parseError} />
          ) : (
            <>
              <PlanilhaToolbar
                onClear={limparPlanilha}
                onSend={handleEnviarSelecionados}
                selectedCount={selectedCount}
                isSending={isBatchSending}
                clearLabel="Substituir arquivo"
              />
              <ConsumoMaterialSpreadsheet
                rows={planilhaRows}
                fileName={planilhaNome}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
              />
            </>
          )}
        </Box>
      )}

      {abaAtiva === 1 && (
        <Box sx={{ display: 'grid', gap: 3 }}>
          <ConsumoMaterialManualForm
            nextNumero={String(planilhaRows.length + 1)}
            onAddRow={handleAddManualRow}
          />

          {exibirPlanilha && (
            <>
              <PlanilhaToolbar
                onClear={limparPlanilha}
                onSend={handleEnviarSelecionados}
                selectedCount={selectedCount}
                isSending={isBatchSending}
                clearLabel="Limpar planilha"
              />
              <ConsumoMaterialSpreadsheet
                rows={planilhaRows}
                fileName={planilhaNome || 'Lançamento manual'}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
              />
            </>
          )}
        </Box>
      )}
    </>
  )
}
