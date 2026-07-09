import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
import {
  ConsumoMaterialSpreadsheet,
  type ConsumoEnvioCanal,
} from '@/components/clinica/ConsumoMaterialSpreadsheet'
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
  rowSelectionAuditoria: RowSelectionState
  onRowSelectionAuditoriaChange: (selection: RowSelectionState) => void
  rowSelectionMaterial: RowSelectionState
  onRowSelectionMaterialChange: (selection: RowSelectionState) => void
  rowIdsComPedido?: Set<string>
  finalizedAuditoriaRowIds?: Set<string>
  finalizedMaterialRowIds?: Set<string>
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
  modoMedicamento?: boolean
  isEnviando?: boolean
  rowsByMes?: ConsumoMaterialRow[]
  onRowsChange?: (rows: ConsumoMaterialRow[], mes: MesConsumoModelo) => void
  onExcluirLinhaRow?: (rowId: string) => void
  onDesfinalizarLinha?: (rowId: string, canal: ConsumoEnvioCanal) => void
}

function ConsumoMaterialConsignadoViewInner({
  lancamentos,
  fileName,
  rowSelectionAuditoria,
  onRowSelectionAuditoriaChange,
  rowSelectionMaterial,
  onRowSelectionMaterialChange,
  rowIdsComPedido,
  finalizedAuditoriaRowIds,
  finalizedMaterialRowIds,
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
  modoMedicamento = false,
  isEnviando,
  rowsByMes,
  onRowsChange,
  onExcluirLinhaRow,
  onDesfinalizarLinha,
}: ConsumoMaterialConsignadoViewProps) {
  const [mesInterno, setMesInterno] = useState<MesConsumoModelo>(getMesAtualModelo)
  const mesSelecionado = mesControlado ?? mesInterno
  const setMesSelecionado = onMesSelecionadoChange ?? setMesInterno

  const linhasExibidas = useMemo(() => {
    if (rowsByMes) return rowsByMes
    return inicializarLinhasDoMes(lancamentos, mesSelecionado)
  }, [rowsByMes, lancamentos, mesSelecionado])

  const linhasExibidasRef = useRef(linhasExibidas)
  linhasExibidasRef.current = linhasExibidas

  const preenchidasNoMes = useMemo(() => {
    if (rowsByMes) {
      return linhasExibidas.filter(isLinhaPreenchida).length
    }
    return lancamentos.filter(
      (r) => isLinhaPreenchida(r) && dataPertenceAoMes(r.data, mesSelecionado),
    ).length
  }, [rowsByMes, linhasExibidas, lancamentos, mesSelecionado])

  const totalNoSistema = useMemo(
    () => totalPedidos ?? lancamentos.filter(isLinhaPreenchida).length,
    [totalPedidos, lancamentos],
  )

  const updateRows = useCallback(
    (next: ConsumoMaterialRow[]) => {
      onRowsChange?.(next, mesSelecionado)
    },
    [onRowsChange, mesSelecionado],
  )

  const handleCellChange = useCallback(
    (rowId: string, field: ConsumoMaterialColunaKey, value: string) => {
      updateRows(
        linhasExibidasRef.current.map((row) =>
          row.id === rowId ? atualizarCampoConsumo(row, field, value) : row,
        ),
      )
    },
    [updateRows],
  )

  const handleInserirLinha = useCallback(
    (rowId: string, position: InserirLinhaConsumoPosicao) => {
      updateRows(inserirLinhaConsumo(linhasExibidasRef.current, rowId, position, mesSelecionado))
    },
    [updateRows, mesSelecionado],
  )

  const handleExcluirLinha = useCallback(
    (rowId: string) => {
      onExcluirLinhaRow?.(rowId)
      updateRows(excluirLinhaConsumo(linhasExibidasRef.current, rowId))
      const withoutRow = (selection: RowSelectionState) =>
        Object.fromEntries(Object.entries(selection).filter(([id]) => id !== rowId))
      onRowSelectionAuditoriaChange(withoutRow(rowSelectionAuditoria))
      onRowSelectionMaterialChange(withoutRow(rowSelectionMaterial))
    },
    [
      onExcluirLinhaRow,
      updateRows,
      onRowSelectionAuditoriaChange,
      onRowSelectionMaterialChange,
      rowSelectionAuditoria,
      rowSelectionMaterial,
    ],
  )

  return (
    <ConsumoMaterialSpreadsheet
      measureRows={lancamentos}
      rows={linhasExibidas}
      fileName={`${mesSelecionado.label} — ${fileName || 'Consumo Material Consignado'}`}
      rowSelectionAuditoria={rowSelectionAuditoria}
      onRowSelectionAuditoriaChange={onRowSelectionAuditoriaChange}
      rowSelectionMaterial={rowSelectionMaterial}
      onRowSelectionMaterialChange={onRowSelectionMaterialChange}
      lancamentosPreenchidos={preenchidasNoMes}
      rowIdsComPedido={rowIdsComPedido}
      finalizedAuditoriaRowIds={finalizedAuditoriaRowIds}
      finalizedMaterialRowIds={finalizedMaterialRowIds}
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
      modoMedicamento={modoMedicamento}
      isEnviando={isEnviando}
      editable={Boolean(onRowsChange)}
      onCellChange={handleCellChange}
      onInserirLinha={handleInserirLinha}
      onExcluirLinha={handleExcluirLinha}
      onDesfinalizarLinha={onDesfinalizarLinha}
      headerExtra={
        <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 200 } }}>
          <InputLabel id="mes-consumo-label">Mês de referência</InputLabel>
          <Select
            labelId="mes-consumo-label"
            label="Mês de referência"
            value={mesSelecionado.id}
            onChange={(e) => {
              const mes = CONSUMO_MESES_MODELO.find((m) => m.id === e.target.value)
              if (mes) setMesSelecionado(mes)
            }}
            sx={{
              bgcolor: '#fff',
              fontSize: '11px',
              fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
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

export const ConsumoMaterialConsignadoView = memo(ConsumoMaterialConsignadoViewInner)
