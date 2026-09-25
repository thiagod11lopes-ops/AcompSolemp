import { useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined'
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined'
import type { ReactNode } from 'react'
import type { TotalIndenizadoLinha, TotalIndenizadoPeriodoTipo } from '@/utils/totalIndenizado'
import {
  calcularTotalIndenizado,
  filtrarLinhasTotalIndenizado,
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

export interface IndenizadoValorCardProps {
  title: string
  description: string
  linhas: TotalIndenizadoLinha[]
  accent?: string
  icon?: ReactNode
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

export function IndenizadoDetalheDialog({
  open,
  onClose,
  title,
  description,
  linhas,
  accent = premiumTokens.purple,
  icon,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  linhas: TotalIndenizadoLinha[]
  accent?: string
  icon?: ReactNode
}) {
  const theme = useTheme()
  const [periodoTipo, setPeriodoTipo] = useState<TotalIndenizadoPeriodoTipo>('ano')
  const [referencia, setReferencia] = useState(() => {
    const d = new Date()
    d.setMonth(0, 1)
    return d
  })

  const filtro = useMemo(
    () => ({ tipo: periodoTipo, referencia }),
    [periodoTipo, referencia],
  )
  const total = useMemo(() => calcularTotalIndenizado(linhas, filtro), [linhas, filtro])
  const periodoLabel = formatTotalIndenizadoPeriodoLabel(periodoTipo, referencia)
  const anosOptions = useMemo(() => anosDisponiveis(linhas, referencia), [linhas, referencia])
  const linhasFiltradas = useMemo(
    () => filtrarLinhasTotalIndenizado(linhas, filtro),
    [linhas, filtro],
  )

  const handleTipoChange = (_: React.MouseEvent<HTMLElement>, next: TotalIndenizadoPeriodoTipo | null) => {
    if (!next) return
    setPeriodoTipo(next)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <Box
        sx={{
          px: 2.5,
          pt: 2,
          pb: 1.5,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          borderBottom: `1px solid ${alpha(accent, 0.2)}`,
          bgcolor: alpha(accent, 0.06),
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: `${premiumTokens.radiusSm}px`,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(accent, 0.14),
            color: accent,
            border: `1px solid ${alpha(accent, 0.25)}`,
            flexShrink: 0,
          }}
        >
          {icon ?? <PaidOutlinedIcon />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description} — {periodoLabel}
          </Typography>
        </Box>
        <IconButton aria-label="Fechar" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-start' }}>
          <ToggleButtonGroup size="small" exclusive value={periodoTipo} onChange={handleTipoChange}>
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
                if (!Number.isNaN(next.getTime())) setReferencia(next)
              }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          ) : null}

          {periodoTipo === 'mes' ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel id="indenizado-modal-mes-label">Mês</InputLabel>
                <Select
                  labelId="indenizado-modal-mes-label"
                  label="Mês"
                  value={referencia.getMonth()}
                  onChange={(e) => {
                    const next = new Date(referencia)
                    next.setMonth(Number(e.target.value))
                    setReferencia(next)
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
                <InputLabel id="indenizado-modal-ano-mes-label">Ano</InputLabel>
                <Select
                  labelId="indenizado-modal-ano-mes-label"
                  label="Ano"
                  value={referencia.getFullYear()}
                  onChange={(e) => {
                    const next = new Date(referencia)
                    next.setFullYear(Number(e.target.value))
                    setReferencia(next)
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
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="indenizado-modal-ano-label">Ano</InputLabel>
              <Select
                labelId="indenizado-modal-ano-label"
                label="Ano"
                value={referencia.getFullYear()}
                onChange={(e) => {
                  const next = new Date(referencia)
                  next.setFullYear(Number(e.target.value))
                  next.setMonth(0, 1)
                  setReferencia(next)
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

        <Box
          sx={{
            display: 'flex',
            gap: 3,
            flexWrap: 'wrap',
            px: 1.5,
            py: 1.25,
            borderRadius: 2,
            bgcolor: alpha(accent, 0.08),
            border: `1px solid ${alpha(accent, 0.18)}`,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Total no período
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: accent }}>
              {formatCurrency(total)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Linhas
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {linhasFiltradas.length}
            </Typography>
          </Box>
        </Box>

        <TableContainer
          sx={{
            maxHeight: 360,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>NIP</TableCell>
                <TableCell align="right">Valor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {linhasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      Nenhum valor no período selecionado.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                linhasFiltradas.map((linha) => (
                  <TableRow key={linha.linhaKey} hover>
                    <TableCell>{linha.data || '—'}</TableCell>
                    <TableCell>{linha.nip || '—'}</TableCell>
                    <TableCell align="right">{formatCurrency(linha.valorIndenizado)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  )
}

export function IndenizadoValorCard({
  title,
  description,
  linhas,
  accent = premiumTokens.purple,
  icon,
}: IndenizadoValorCardProps) {
  const [aberto, setAberto] = useState(false)

  const totalGeral = useMemo(
    () => linhas.reduce((acc, linha) => acc + (linha.valorIndenizado || 0), 0),
    [linhas],
  )

  return (
    <>
      <Card
        sx={{
          height: '100%',
          border: `1px solid ${alpha(accent, 0.22)}`,
          boxShadow: premiumTokens.shadowSm,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: premiumTokens.shadow,
          },
        }}
      >
        <CardActionArea onClick={() => setAberto(true)} sx={{ height: '100%', alignItems: 'stretch' }}>
          <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 600, letterSpacing: '0.02em' }}
              >
                {title}
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
                {icon ?? <PaidOutlinedIcon />}
              </Box>
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: accent }}>
              {formatCurrency(totalGeral)}
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto' }}>
              {description} — clique para filtrar por período
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      <IndenizadoDetalheDialog
        open={aberto}
        onClose={() => setAberto(false)}
        title={title}
        description={description}
        linhas={linhas}
        accent={accent}
        icon={icon}
      />
    </>
  )
}

/** Card: valores ainda em Auditoria ou IMH */
export function ValorASerIndenizadoCard(
  props: Omit<IndenizadoValorCardProps, 'title' | 'description' | 'accent' | 'icon'>,
) {
  return (
    <IndenizadoValorCard
      {...props}
      title="Valor a ser indenizado"
      description="Coluna % A INDENIZAR nos cards Auditoria e IMH"
      accent={premiumTokens.orange}
      icon={<RequestQuoteOutlinedIcon />}
    />
  )
}

/** Card: valores já finalizados em IMH */
export function TotalIndenizadoCard(
  props: Omit<IndenizadoValorCardProps, 'title' | 'description' | 'accent' | 'icon'>,
) {
  return (
    <IndenizadoValorCard
      {...props}
      title="Total Indenizado"
      description="Coluna % A INDENIZAR finalizada em IMH"
      accent={premiumTokens.purple}
      icon={<PaidOutlinedIcon />}
    />
  )
}
