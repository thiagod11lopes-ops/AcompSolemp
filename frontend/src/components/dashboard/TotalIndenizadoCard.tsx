import { useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
} from '@mui/material'
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined'
import type { TotalIndenizadoLinha, TotalIndenizadoPeriodoTipo } from '@/utils/totalIndenizado'
import {
  calcularTotalIndenizado,
  formatTotalIndenizadoPeriodoLabel,
} from '@/utils/totalIndenizado'
import { formatCurrency } from '@/utils/format'
import { premiumTokens } from '@/theme/tokens'

const MESES = [
  { value: 0, label: 'Janeiro' },
  { value: 1, label: 'Fevereiro' },
  { value: 2, label: 'Março' },
  { value: 3, label: 'Abril' },
  { value: 4, label: 'Maio' },
  { value: 5, label: 'Junho' },
  { value: 6, label: 'Julho' },
  { value: 7, label: 'Agosto' },
  { value: 8, label: 'Setembro' },
  { value: 9, label: 'Outubro' },
  { value: 10, label: 'Novembro' },
  { value: 11, label: 'Dezembro' },
] as const

interface TotalIndenizadoCardProps {
  linhas: TotalIndenizadoLinha[]
  periodoTipo: TotalIndenizadoPeriodoTipo
  referencia: Date
  onPeriodoTipoChange: (tipo: TotalIndenizadoPeriodoTipo) => void
  onReferenciaChange: (referencia: Date) => void
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function anosDisponiveis(linhas: TotalIndenizadoLinha[], referencia: Date): number[] {
  const anos = new Set<number>([referencia.getFullYear(), new Date().getFullYear()])
  for (const linha of linhas) {
    const match = linha.data.trim().match(/(\d{2,4})$/)
    if (match) {
      let year = parseInt(match[1], 10)
      if (match[1].length === 2) year = 2000 + year
      if (Number.isFinite(year)) anos.add(year)
    }
  }
  return [...anos].sort((a, b) => b - a)
}

export function TotalIndenizadoCard({
  linhas,
  periodoTipo,
  referencia,
  onPeriodoTipoChange,
  onReferenciaChange,
}: TotalIndenizadoCardProps) {
  const accent = premiumTokens.purple

  const total = useMemo(
    () => calcularTotalIndenizado(linhas, { tipo: periodoTipo, referencia }),
    [linhas, periodoTipo, referencia],
  )

  const periodoLabel = formatTotalIndenizadoPeriodoLabel(periodoTipo, referencia)
  const anosOptions = useMemo(() => anosDisponiveis(linhas, referencia), [linhas, referencia])

  const handleTipoChange = (_: React.MouseEvent<HTMLElement>, next: TotalIndenizadoPeriodoTipo | null) => {
    if (!next) return
    onPeriodoTipoChange(next)
  }

  return (
    <Card
      sx={{
        height: '100%',
        border: `1px solid ${alpha(accent, 0.22)}`,
        boxShadow: premiumTokens.shadowSm,
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: '0.02em' }}
          >
            Total Indenizado
          </Typography>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: `${premiumTokens.radiusSm}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(accent, 0.12),
              color: accent,
              border: `1px solid ${alpha(accent, 0.2)}`,
            }}
          >
            <PaidOutlinedIcon />
          </Box>
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: accent }}>
          {formatCurrency(total)}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          Soma do valor a indenizar (IMH) por NIP nas planilhas — {periodoLabel}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 'auto' }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={periodoTipo}
            onChange={handleTipoChange}
            sx={{ alignSelf: 'flex-start' }}
          >
            <ToggleButton value="dia">Dia</ToggleButton>
            <ToggleButton value="mes">Mês</ToggleButton>
            <ToggleButton value="ano">Ano</ToggleButton>
          </ToggleButtonGroup>

          {periodoTipo === 'dia' ? (
            <TextField
              size="small"
              label="Data"
              type="date"
              value={toDateInputValue(referencia)}
              onChange={(e) => {
                const next = new Date(`${e.target.value}T12:00:00`)
                if (!Number.isNaN(next.getTime())) onReferenciaChange(next)
              }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          ) : null}

          {periodoTipo === 'mes' ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 130, flex: 1 }}>
                <InputLabel id="total-indenizado-mes-label">Mês</InputLabel>
                <Select
                  labelId="total-indenizado-mes-label"
                  label="Mês"
                  value={referencia.getMonth()}
                  onChange={(e) => {
                    const next = new Date(referencia)
                    next.setMonth(Number(e.target.value))
                    onReferenciaChange(next)
                  }}
                >
                  {MESES.map((mes) => (
                    <MenuItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 96 }}>
                <InputLabel id="total-indenizado-ano-mes-label">Ano</InputLabel>
                <Select
                  labelId="total-indenizado-ano-mes-label"
                  label="Ano"
                  value={referencia.getFullYear()}
                  onChange={(e) => {
                    const next = new Date(referencia)
                    next.setFullYear(Number(e.target.value))
                    onReferenciaChange(next)
                  }}
                >
                  {anosOptions.map((ano) => (
                    <MenuItem key={ano} value={ano}>
                      {ano}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          ) : null}

          {periodoTipo === 'ano' ? (
            <FormControl size="small" sx={{ maxWidth: 120 }}>
              <InputLabel id="total-indenizado-ano-label">Ano</InputLabel>
              <Select
                labelId="total-indenizado-ano-label"
                label="Ano"
                value={referencia.getFullYear()}
                onChange={(e) => {
                  const next = new Date(referencia)
                  next.setFullYear(Number(e.target.value))
                  next.setMonth(0, 1)
                  onReferenciaChange(next)
                }}
              >
                {anosOptions.map((ano) => (
                  <MenuItem key={ano} value={ano}>
                    {ano}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  )
}
