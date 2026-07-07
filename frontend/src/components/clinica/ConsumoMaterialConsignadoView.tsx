import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import { useMemo, useState } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
import { ConsumoMaterialSpreadsheet } from '@/components/clinica/ConsumoMaterialSpreadsheet'
import type { ConsumoMaterialRow } from '@/utils/consumoMaterialOds'
import {
  CATALOGO_REFERENCIA,
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
    <Box sx={{ display: 'grid', gap: 3 }}>
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

      <Accordion
        defaultExpanded={false}
        elevation={0}
        sx={(theme) => ({
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          borderRadius: '12px !important',
          '&:before': { display: 'none' },
          overflow: 'hidden',
        })}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MenuBookIcon color="primary" fontSize="small" />
            <Typography sx={{ fontWeight: 700 }}>
              Tabela de referência — Diagnóstico / CID / Procedimento / Material
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              ({CATALOGO_REFERENCIA.length} itens fixos)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: 280 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['DIAGNÓSTICO', 'CID', 'PROCEDIMENTO', 'MATERIAL'].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        bgcolor: '#37474F',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        letterSpacing: 0.5,
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {CATALOGO_REFERENCIA.map((row, index) => (
                  <TableRow
                    key={`${row.cid}-${index}`}
                    sx={(theme) => ({
                      bgcolor:
                        index % 2 === 0
                          ? 'background.paper'
                          : alpha(theme.palette.action.hover, 0.04),
                    })}
                  >
                    <TableCell sx={{ fontSize: '0.78rem' }}>{row.diagnostico}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{row.cid}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{row.procedimento}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                      {row.material || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

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
      />
    </Box>
  )
}
