import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'
import { useMemo, useState } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
import { ConsumoMaterialSpreadsheet } from '@/components/clinica/ConsumoMaterialSpreadsheet'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import {
  CONSUMO_MESES_MODELO,
  getMesAtualModelo,
  isLinhaPreenchida,
  montarLinhasPlanilhaFixa,
  dataPertenceAoMes,
  type MesConsumoModelo,
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
}: ConsumoMaterialConsignadoViewProps) {
  const [mesInterno, setMesInterno] = useState<MesConsumoModelo>(getMesAtualModelo)
  const mesSelecionado = mesControlado ?? mesInterno
  const setMesSelecionado = onMesSelecionadoChange ?? setMesInterno

  const linhasExibidas = useMemo(
    () => montarLinhasPlanilhaFixa(lancamentos, mesSelecionado),
    [lancamentos, mesSelecionado],
  )

  const preenchidasNoMes = lancamentos.filter(
    (r) => isLinhaPreenchida(r) && dataPertenceAoMes(r.data, mesSelecionado),
  ).length

  const totalNoSistema = totalPedidos ?? lancamentos.filter(isLinhaPreenchida).length

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: { xs: 'stretch', sm: 'flex-end' },
        }}
      >
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="mes-consumo-label">Mês de referência</InputLabel>
          <Select
            labelId="mes-consumo-label"
            label="Mês de referência"
            value={mesSelecionado.id}
            onChange={(e) => {
              const mes = CONSUMO_MESES_MODELO.find((m) => m.id === e.target.value)
              if (mes) setMesSelecionado(mes)
            }}
          >
            {CONSUMO_MESES_MODELO.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <ConsumoMaterialSpreadsheet
        rows={linhasExibidas}
        fileName={`${mesSelecionado.label} — ${fileName || 'Consumo Material Consignado'}`}
        rowSelection={rowSelection}
        onRowSelectionChange={onRowSelectionChange}
        mesReferencia={mesSelecionado.label}
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
      />
    </Box>
  )
}
