import {
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'
import { useMemo } from 'react'
import {
  anosDisponiveisFromDatas,
  diasNoMes,
  MESES_FILTRO_OPCOES,
  type PlanilhaDataFiltro,
} from '@/utils/planilhaDataFiltro'

interface PlanilhaDataFiltrosProps {
  value: PlanilhaDataFiltro
  onChange: (next: PlanilhaDataFiltro) => void
  /** Datas das linhas (para montar a lista de anos). */
  datas: string[]
  idPrefix: string
}

export function PlanilhaDataFiltros({
  value,
  onChange,
  datas,
  idPrefix,
}: PlanilhaDataFiltrosProps) {
  const diasOptions = useMemo(
    () => Array.from({ length: diasNoMes(value.mes, value.ano) }, (_, i) => i + 1),
    [value.mes, value.ano],
  )
  const anosOptions = useMemo(() => anosDisponiveisFromDatas(datas), [datas])

  const patch = (partial: Partial<PlanilhaDataFiltro>) => {
    const next = { ...value, ...partial }
    const maxDia = diasNoMes(next.mes, next.ano)
    if (next.dia > maxDia) next.dia = 0
    onChange(next)
  }

  return (
    <>
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={value.mostrarTodos}
            onChange={(_, checked) => patch({ mostrarTodos: checked })}
          />
        }
        label="Todos"
        sx={{
          ml: 0.5,
          mr: 0,
          '& .MuiFormControlLabel-label': { fontSize: '0.8rem', fontWeight: 600 },
        }}
      />
      <FormControl size="small" sx={{ minWidth: 80 }} disabled={value.mostrarTodos}>
        <InputLabel id={`${idPrefix}-dia`}>Dia</InputLabel>
        <Select
          labelId={`${idPrefix}-dia`}
          label="Dia"
          value={value.dia}
          onChange={(e) => patch({ dia: Number(e.target.value) })}
          sx={{ height: 32, fontSize: '0.8rem' }}
        >
          <MenuItem value={0}>Todos</MenuItem>
          {diasOptions.map((dia) => (
            <MenuItem key={dia} value={dia}>
              {String(dia).padStart(2, '0')}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 120 }} disabled={value.mostrarTodos}>
        <InputLabel id={`${idPrefix}-mes`}>Mês</InputLabel>
        <Select
          labelId={`${idPrefix}-mes`}
          label="Mês"
          value={value.mes}
          onChange={(e) => patch({ mes: Number(e.target.value) })}
          sx={{ height: 32, fontSize: '0.8rem' }}
        >
          {MESES_FILTRO_OPCOES.map((mes) => (
            <MenuItem key={mes.value} value={mes.value}>
              {mes.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 88 }} disabled={value.mostrarTodos}>
        <InputLabel id={`${idPrefix}-ano`}>Ano</InputLabel>
        <Select
          labelId={`${idPrefix}-ano`}
          label="Ano"
          value={value.ano}
          onChange={(e) => patch({ ano: Number(e.target.value) })}
          sx={{ height: 32, fontSize: '0.8rem' }}
        >
          {anosOptions.map((ano) => (
            <MenuItem key={ano} value={ano}>
              {ano}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  )
}
