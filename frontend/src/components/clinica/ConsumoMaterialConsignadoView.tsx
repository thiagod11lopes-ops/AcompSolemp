import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  alpha,
} from '@mui/material'
import { useMemo, useState } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
import { ConsumoMaterialSpreadsheet } from '@/components/clinica/ConsumoMaterialSpreadsheet'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import {
  CONSUMO_MESES_MODELO,
  getMesAtualModelo,
  isLinhaPreenchida,
  inicializarLinhasDoMes,
  inserirLinhaConsumo,
  excluirLinhaConsumo,
  atualizarCampoConsumo,
  dataPertenceAoMes,
  type MesConsumoModelo,
  type ConsumoMaterialColunaKey,
  type InserirLinhaConsumoPosicao,
} from '@/utils/consumoMaterialTemplate'

interface ConsumoMaterialConsignadoViewProps {
  lancamentos: ConsumoMaterialRow[]
  fileName: string
  rowSelection: RowSelectionState
  onRowSelectionChange: (selection: RowSelectionState) => void
  rowIdsComPedido?: Set<string>
  totalPedidos?: number
  mesSelecionado?: MesConsumoModelo
  onMesSelecionadoChange?: (mes: MesConsumoModelo) => void
  onExcluirTudo?: () => Promise<void>
  onAdicionarPlanilha?: (mes: number, ano: number, file: File) => Promise<void>
  isExcluindo?: boolean
  isAdicionando?: boolean
  addPlanilhaError?: string | null
  onAddPlanilhaErrorClear?: () => void
  onLimparRascunho?: () => void
  onEnviarImh?: () => void
  onEnviarMaterial?: () => void
  isEnviando?: boolean
  rowsByMes?: ConsumoMaterialRow[]
  onRowsChange?: (rows: ConsumoMaterialRow[], mes: MesConsumoModelo) => void
  onExcluirLinhaRow?: (rowId: string) => void
}

export function ConsumoMaterialConsignadoView({
  lancamentos,
  fileName,
  rowSelection,
  onRowSelectionChange,
  rowIdsComPedido,
  totalPedidos,
  mesSelecionado: mesControlado,
  onMesSelecionadoChange,
  onExcluirTudo,
  onAdicionarPlanilha,
  isExcluindo,
  isAdicionando,
  addPlanilhaError,
  onAddPlanilhaErrorClear,
  onLimparRascunho,
  onEnviarImh,
  onEnviarMaterial,
  isEnviando,
  rowsByMes,
  onRowsChange,
  onExcluirLinhaRow,
}: ConsumoMaterialConsignadoViewProps) {
  const [mesInterno, setMesInterno] = useState<MesConsumoModelo>(getMesAtualModelo)
  const mesSelecionado = mesControlado ?? mesInterno
  const setMesSelecionado = onMesSelecionadoChange ?? setMesInterno

  const linhasExibidas = useMemo(() => {
    if (rowsByMes) return rowsByMes
    return inicializarLinhasDoMes(lancamentos, mesSelecionado)
  }, [rowsByMes, lancamentos, mesSelecionado])

  const preenchidasNoMes = lancamentos.filter(
    (r) => isLinhaPreenchida(r) && dataPertenceAoMes(r.data, mesSelecionado),
  ).length

  const totalNoSistema = totalPedidos ?? lancamentos.filter(isLinhaPreenchida).length

  const updateRows = (next: ConsumoMaterialRow[]) => {
    onRowsChange?.(next, mesSelecionado)
  }

  const handleCellChange = (rowId: string, field: ConsumoMaterialColunaKey, value: string) => {
    updateRows(
      linhasExibidas.map((row) =>
        row.id === rowId ? atualizarCampoConsumo(row, field, value) : row,
      ),
    )
  }

  const handleInserirLinha = (rowId: string, position: InserirLinhaConsumoPosicao) => {
    updateRows(inserirLinhaConsumo(linhasExibidas, rowId, position, mesSelecionado))
  }

  const handleExcluirLinha = (rowId: string) => {
    onExcluirLinhaRow?.(rowId)
    updateRows(excluirLinhaConsumo(linhasExibidas, rowId))
    onRowSelectionChange(
      Object.fromEntries(
        Object.entries(rowSelection).filter(([id]) => id !== rowId),
      ),
    )
  }

  return (
    <ConsumoMaterialSpreadsheet
      rows={linhasExibidas}
      fileName={`${mesSelecionado.label} — ${fileName || 'Consumo Material Consignado'}`}
      rowSelection={rowSelection}
      onRowSelectionChange={onRowSelectionChange}
      lancamentosPreenchidos={preenchidasNoMes}
      rowIdsComPedido={rowIdsComPedido}
      totalLancamentos={totalNoSistema}
      onExcluirTudo={onExcluirTudo}
      onAdicionarPlanilha={onAdicionarPlanilha}
      isExcluindo={isExcluindo}
      isAdicionando={isAdicionando}
      addPlanilhaError={addPlanilhaError}
      onAddPlanilhaErrorClear={onAddPlanilhaErrorClear}
      onLimparRascunho={onLimparRascunho}
      onEnviarImh={onEnviarImh}
      onEnviarMaterial={onEnviarMaterial}
      isEnviando={isEnviando}
      editable={Boolean(onRowsChange)}
      onCellChange={handleCellChange}
      onInserirLinha={handleInserirLinha}
      onExcluirLinha={handleExcluirLinha}
      headerExtra={
        <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 200 } }}>
          <InputLabel
            id="mes-consumo-label"
            sx={{ color: alpha('#fff', 0.85), '&.Mui-focused': { color: 'white' } }}
          >
            Mês de referência
          </InputLabel>
          <Select
            labelId="mes-consumo-label"
            label="Mês de referência"
            value={mesSelecionado.id}
            onChange={(e) => {
              const mes = CONSUMO_MESES_MODELO.find((m) => m.id === e.target.value)
              if (mes) setMesSelecionado(mes)
            }}
            sx={{
              color: 'white',
              bgcolor: alpha('#fff', 0.12),
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.25) },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.45) },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
              '& .MuiSvgIcon-root': { color: alpha('#fff', 0.85) },
            }}
          >
            {CONSUMO_MESES_MODELO.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      }
    />
  )
}
