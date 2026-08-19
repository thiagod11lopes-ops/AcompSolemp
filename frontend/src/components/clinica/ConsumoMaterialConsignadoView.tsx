import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
  alpha,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
import {
  ConsumoMaterialSpreadsheet,
  type ConsumoEnvioCanal,
} from '@/components/clinica/ConsumoMaterialSpreadsheet'
import type { AdicionarPlanilhaInput } from '@/components/clinica/AdicionarPlanilhaModal'
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
import { CONSUMO_ABA_PRINCIPAL_ID } from '@/services/consumoPlanilhaService'

export interface ConsumoPlanilhaAbaTab {
  id: string
  nome: string
}

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
  devolvidosAuditoriaRowIds?: Set<string>
  devolvidosMaterialRowIds?: Set<string>
  totalPedidos?: number
  mesSelecionado?: MesConsumoModelo
  onMesSelecionadoChange?: (mes: MesConsumoModelo) => void
  onExcluirTudo?: () => Promise<void>
  onAdicionarPlanilha?: (input: AdicionarPlanilhaInput) => Promise<void>
  isExcluindo?: boolean
  isAdicionando?: boolean
  addPlanilhaError?: string | null
  onAddPlanilhaErrorClear?: () => void
  onLimparRascunho?: () => void
  onEnviarImh?: () => void
  onEnviarParalelo?: () => void
  modoMedicamento?: boolean
  /** No modo exemplo, a planilha PME fica fixa (somente leitura) com o conteúdo de demonstração. */
  planilhaFixaDemo?: boolean
  isEnviando?: boolean
  rowsByMes?: ConsumoMaterialRow[]
  onRowsChange?: (rows: ConsumoMaterialRow[], mes: MesConsumoModelo) => void
  onExcluirLinhaRow?: (rowId: string) => void
  onDesfinalizarLinha?: (rowId: string, canal: ConsumoEnvioCanal) => void
  planilhaAbas?: ConsumoPlanilhaAbaTab[]
  abaPlanilhaAtivaId?: string
  onAbaPlanilhaChange?: (abaId: string) => void
  onFecharAbaPlanilha?: (abaId: string) => void
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
  devolvidosAuditoriaRowIds,
  devolvidosMaterialRowIds,
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
  onEnviarParalelo,
  modoMedicamento = false,
  planilhaFixaDemo = false,
  isEnviando,
  rowsByMes,
  onRowsChange,
  onExcluirLinhaRow,
  onDesfinalizarLinha,
  planilhaAbas = [],
  abaPlanilhaAtivaId = CONSUMO_ABA_PRINCIPAL_ID,
  onAbaPlanilhaChange,
  onFecharAbaPlanilha,
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

  const showAbas = planilhaAbas.length > 0 && Boolean(onAbaPlanilhaChange)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {showAbas && (
        <Box
          sx={(theme) => ({
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            borderRadius: '8px 8px 0 0',
            px: 0.5,
          })}
        >
          <Tabs
            value={abaPlanilhaAtivaId}
            onChange={(_, value: string) => onAbaPlanilhaChange?.(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 42,
              '& .MuiTab-root': {
                minHeight: 42,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                px: 1.5,
              },
            }}
          >
            {planilhaAbas.map((aba) => {
              const isExtra = aba.id !== CONSUMO_ABA_PRINCIPAL_ID
              return (
                <Tab
                  key={aba.id}
                  value={aba.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                        {aba.nome}
                      </Typography>
                      {isExtra && onFecharAbaPlanilha && (
                        <IconButton
                          size="small"
                          component="span"
                          aria-label={`Fechar aba ${aba.nome}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onFecharAbaPlanilha(aba.id)
                          }}
                          sx={{ p: 0.25, ml: 0.25 }}
                        >
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      )}
                    </Box>
                  }
                />
              )
            })}
          </Tabs>
        </Box>
      )}

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
        devolvidosAuditoriaRowIds={devolvidosAuditoriaRowIds}
        devolvidosMaterialRowIds={devolvidosMaterialRowIds}
        totalLancamentos={totalNoSistema}
        onExcluirTudo={onExcluirTudo}
        onAdicionarPlanilha={onAdicionarPlanilha}
        isExcluindo={isExcluindo}
        isAdicionando={isAdicionando}
        addPlanilhaError={addPlanilhaError}
        onAddPlanilhaErrorClear={onAddPlanilhaErrorClear}
        onLimparRascunho={planilhaFixaDemo ? undefined : onLimparRascunho}
        onEnviarImh={onEnviarImh}
        onEnviarParalelo={onEnviarParalelo}
        modoMedicamento={modoMedicamento}
        isEnviando={isEnviando}
        editable={Boolean(onRowsChange) && !planilhaFixaDemo}
        onCellChange={planilhaFixaDemo ? undefined : handleCellChange}
        onInserirLinha={planilhaFixaDemo ? undefined : handleInserirLinha}
        onExcluirLinha={planilhaFixaDemo ? undefined : handleExcluirLinha}
        onDesfinalizarLinha={onDesfinalizarLinha}
        headerExtra={
          <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 200 } }}>
            <InputLabel
              id="mes-consumo-label"
              sx={{
                color: '#374151',
                '&.Mui-focused': { color: 'primary.main' },
              }}
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
                bgcolor: '#fff',
                color: '#111827',
                fontSize: '11px',
                fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
                '& .MuiSelect-select': {
                  color: '#111827',
                },
                '& .MuiSvgIcon-root': {
                  color: '#4b5563',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0,0,0,0.23)',
                },
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
    </Box>
  )
}

export const ConsumoMaterialConsignadoView = memo(ConsumoMaterialConsignadoViewInner)
