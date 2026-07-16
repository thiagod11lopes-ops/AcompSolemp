import {
  alpha,
  Box,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { ReactNode } from 'react'
import type { EmpenhadoMesTotal, PrazoStatus } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'
import { premiumTokens } from '@/theme/tokens'

export type KpiDetalheColumn = {
  id: string
  label: string
  align?: 'left' | 'right' | 'center'
  render: (row: Record<string, unknown>) => ReactNode
}

export type KpiDetalheSummary = {
  label: string
  value: string | number
}

interface KpiDetalheDialogProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  accent?: string
  icon?: ReactNode
  summaries?: KpiDetalheSummary[]
  columns: KpiDetalheColumn[]
  rows: Record<string, unknown>[]
  emptyMessage?: string
  /** Filtro de mês (Total empenhado do mês) */
  meses?: EmpenhadoMesTotal[]
  mesSelecionado?: string
  onSelectMes?: (mesChave: string) => void
  /** Tempo médio — breakdown por etapa */
  tempoPorEtapa?: { etapa: string; dias: number }[]
}

function prazoChipColor(
  status: PrazoStatus | undefined,
): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'NO_PRAZO') return 'success'
  if (status === 'PROXIMO_VENCIMENTO') return 'warning'
  if (status === 'ATRASADO') return 'error'
  return 'default'
}

export function prazoStatusLabel(status: PrazoStatus): string {
  if (status === 'NO_PRAZO') return 'No prazo'
  if (status === 'PROXIMO_VENCIMENTO') return 'Próx. vencimento'
  if (status === 'ATRASADO') return 'Atrasado'
  return status
}

export function PrazoStatusChip({ status }: { status: PrazoStatus }) {
  return (
    <Chip
      size="small"
      label={prazoStatusLabel(status)}
      color={prazoChipColor(status)}
      variant="outlined"
    />
  )
}

export function KpiDetalheDialog({
  open,
  onClose,
  title,
  subtitle,
  accent,
  icon,
  summaries = [],
  columns,
  rows,
  emptyMessage = 'Nenhum registro encontrado para este indicador.',
  meses,
  mesSelecionado,
  onSelectMes,
  tempoPorEtapa,
}: KpiDetalheDialogProps) {
  const theme = useTheme()
  const color = accent ?? theme.palette.primary.main

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(8px)',
            backgroundColor: alpha('#0B1220', 0.55),
          },
        },
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            border: `1px solid ${alpha(color, 0.28)}`,
            boxShadow: `0 28px 90px ${alpha('#000', 0.35)}`,
            background: `linear-gradient(160deg, ${alpha(color, 0.14)} 0%, ${theme.palette.background.paper} 38%)`,
          },
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 2.5,
          pb: 2,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        }}
      >
        {icon && (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: `${premiumTokens.radiusSm}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(color, 0.14),
              color,
              border: `1px solid ${alpha(color, 0.28)}`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0, pr: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {(summaries.length > 0 || meses || (tempoPorEtapa && tempoPorEtapa.length > 0)) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mb: 2.5, alignItems: 'center' }}>
            {summaries.map((s) => (
              <Chip
                key={s.label}
                label={
                  <Box component="span" sx={{ display: 'inline-flex', gap: 0.75 }}>
                    <Box component="span" sx={{ opacity: 0.75 }}>
                      {s.label}
                    </Box>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {s.value}
                    </Box>
                  </Box>
                }
                sx={{
                  height: 34,
                  borderRadius: 2,
                  bgcolor: alpha(color, 0.1),
                  border: `1px solid ${alpha(color, 0.22)}`,
                  '& .MuiChip-label': { px: 1.5 },
                }}
              />
            ))}

            {meses && onSelectMes && mesSelecionado && (
              <TextField
                select
                size="small"
                label="Mês"
                value={mesSelecionado}
                onChange={(e) => onSelectMes(e.target.value)}
                sx={{ minWidth: 200, ml: 'auto' }}
              >
                {meses.map((mes) => (
                  <MenuItem key={mes.mesChave} value={mes.mesChave}>
                    {mes.mesLabel} · {formatCurrency(mes.valor)}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        )}

        {tempoPorEtapa && tempoPorEtapa.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              Tempo médio por etapa
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tempoPorEtapa.map((item) => (
                <Chip
                  key={item.etapa}
                  size="small"
                  variant="outlined"
                  label={`${item.etapa}: ${Math.round(item.dias)}d`}
                />
              ))}
            </Box>
          </Box>
        )}

        {rows.length === 0 ? (
          <Box
            sx={{
              py: 6,
              textAlign: 'center',
              borderRadius: 3,
              border: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
              bgcolor: alpha(theme.palette.action.hover, 0.25),
            }}
          >
            <Typography color="text.secondary">{emptyMessage}</Typography>
          </Box>
        ) : (
          <TableContainer
            sx={{
              maxHeight: 'min(62vh, 560px)',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align ?? 'left'}
                      sx={{
                        fontWeight: 700,
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(6px)',
                      }}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow
                    key={String(row.pedidoId ?? row.id ?? index)}
                    hover
                    sx={{
                      '&:nth-of-type(odd)': {
                        bgcolor: alpha(color, 0.03),
                      },
                    }}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.id} align={col.align ?? 'left'}>
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {rows.length > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1.5, textAlign: 'right' }}
          >
            {rows.length} registro{rows.length === 1 ? '' : 's'}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Helpers de coluna reutilizáveis */
export const kpiCol = {
  pedido: {
    id: 'pedido',
    label: 'Pedido',
    render: (row: Record<string, unknown>) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {String(row.pedidoNumero ?? '—')}
      </Typography>
    ),
  },
  clinica: {
    id: 'clinica',
    label: 'Clínica / Setor',
    render: (row: Record<string, unknown>) => String(row.clinicaNome ?? row.setorNome ?? '—'),
  },
  empresa: {
    id: 'empresa',
    label: 'Empresa',
    render: (row: Record<string, unknown>) => String(row.empresaNome ?? '—'),
  },
  material: {
    id: 'material',
    label: 'Material',
    render: (row: Record<string, unknown>) => String(row.materialDescricao ?? '—'),
  },
  etapa: {
    id: 'etapa',
    label: 'Etapa atual',
    render: (row: Record<string, unknown>) => String(row.etapaAtual ?? '—'),
  },
  valor: {
    id: 'valor',
    label: 'Valor',
    align: 'right' as const,
    render: (row: Record<string, unknown>) => formatCurrency(Number(row.valor ?? 0)),
  },
  solemp: {
    id: 'solemp',
    label: 'SOLEMP',
    render: (row: Record<string, unknown>) => String(row.solempNumero ?? '—'),
  },
  prazo: {
    id: 'prazo',
    label: 'Prazo',
    render: (row: Record<string, unknown>) =>
      row.prazoStatus ? <PrazoStatusChip status={row.prazoStatus as PrazoStatus} /> : '—',
  },
  diasEtapa: {
    id: 'diasEtapa',
    label: 'Dias na etapa',
    align: 'right' as const,
    render: (row: Record<string, unknown>) => String(row.diasNaEtapa ?? '—'),
  },
  diasRestantes: {
    id: 'diasRestantes',
    label: 'Dias restantes',
    align: 'right' as const,
    render: (row: Record<string, unknown>) => String(row.diasRestantes ?? '—'),
  },
  diasConclusao: {
    id: 'diasConclusao',
    label: 'Dias até conclusão',
    align: 'right' as const,
    render: (row: Record<string, unknown>) =>
      row.diasAteConclusao != null ? `${row.diasAteConclusao}d` : '—',
  },
  inicio: {
    id: 'inicio',
    label: 'Início',
    render: (row: Record<string, unknown>) =>
      row.dataSolicitacao ? formatDate(String(row.dataSolicitacao)) : '—',
  },
  status: {
    id: 'status',
    label: 'Status',
    render: (row: Record<string, unknown>) => (row.concluido ? 'Concluído' : 'Em andamento'),
  },
  setor: {
    id: 'setor',
    label: 'Origem',
    render: (row: Record<string, unknown>) => (
      <Chip size="small" variant="outlined" label={String(row.setorLabel ?? '—')} />
    ),
  },
  empenho: {
    id: 'empenho',
    label: 'Empenho',
    render: (row: Record<string, unknown>) => (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {String(row.empenhoNumero ?? '—')}
      </Typography>
    ),
  },
  dataEmpenho: {
    id: 'dataEmpenho',
    label: 'Data empenho',
    render: (row: Record<string, unknown>) =>
      row.dataEmpenho ? formatDate(String(row.dataEmpenho)) : '—',
  },
  mes: {
    id: 'mes',
    label: 'Mês',
    render: (row: Record<string, unknown>) => String(row.mesLabel ?? '—'),
  },
}
