import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import type { BalancoPeriodoTipo } from '@/utils/medicamentoBalanco'

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

interface MedicamentoPeriodoToolbarProps {
  periodoTipo: BalancoPeriodoTipo
  onPeriodoTipo: (tipo: BalancoPeriodoTipo) => void
  referencia: Date
  onReferencia: (date: Date) => void
  anos: number[]
  mostrarExemplo: boolean
  idPrefix: string
}

export function MedicamentoPeriodoToolbar({
  periodoTipo,
  onPeriodoTipo,
  referencia,
  onReferencia,
  anos,
  mostrarExemplo,
  idPrefix,
}: MedicamentoPeriodoToolbarProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 2.5,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1.5,
        alignItems: 'center',
      }}
    >
      {mostrarExemplo ? (
        <Chip size="small" color="info" label="Modo exemplo" sx={{ fontWeight: 700 }} />
      ) : null}
      <ToggleButtonGroup
        exclusive
        size="small"
        value={periodoTipo}
        onChange={(_, next: BalancoPeriodoTipo | null) => {
          if (next) onPeriodoTipo(next)
        }}
      >
        <ToggleButton value="dia" sx={{ textTransform: 'none', px: 1.5 }}>
          Dia
        </ToggleButton>
        <ToggleButton value="mes" sx={{ textTransform: 'none', px: 1.5 }}>
          Mês
        </ToggleButton>
        <ToggleButton value="ano" sx={{ textTransform: 'none', px: 1.5 }}>
          Ano
        </ToggleButton>
      </ToggleButtonGroup>

      {periodoTipo === 'dia' ? (
        <TextField
          type="date"
          size="small"
          label="Data"
          value={toDateInputValue(referencia)}
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            const [y, m, d] = v.split('-').map(Number)
            onReferencia(new Date(y, m - 1, d))
          }}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 170 }}
        />
      ) : null}

      {periodoTipo === 'mes' ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id={`${idPrefix}-mes-label`}>Mês</InputLabel>
            <Select
              labelId={`${idPrefix}-mes-label`}
              label="Mês"
              value={referencia.getMonth()}
              onChange={(e) => {
                const next = new Date(referencia)
                next.setMonth(Number(e.target.value))
                onReferencia(next)
              }}
            >
              {MESES.map((nome, idx) => (
                <MenuItem key={nome} value={idx}>
                  {nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel id={`${idPrefix}-ano-mes-label`}>Ano</InputLabel>
            <Select
              labelId={`${idPrefix}-ano-mes-label`}
              label="Ano"
              value={referencia.getFullYear()}
              onChange={(e) => {
                const next = new Date(referencia)
                next.setFullYear(Number(e.target.value))
                onReferencia(next)
              }}
            >
              {anos.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      ) : null}

      {periodoTipo === 'ano' ? (
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id={`${idPrefix}-ano-label`}>Ano</InputLabel>
          <Select
            labelId={`${idPrefix}-ano-label`}
            label="Ano"
            value={referencia.getFullYear()}
            onChange={(e) => {
              const next = new Date(referencia)
              next.setFullYear(Number(e.target.value))
              onReferencia(next)
            }}
          >
            {anos.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
    </Paper>
  )
}
