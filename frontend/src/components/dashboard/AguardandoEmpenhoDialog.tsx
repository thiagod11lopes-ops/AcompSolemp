import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { AguardandoEmpenhoItem } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'

interface AguardandoEmpenhoDialogProps {
  open: boolean
  onClose: () => void
  itens: AguardandoEmpenhoItem[]
  valorTotal: number
}

function setorColor(
  tipo: AguardandoEmpenhoItem['setorTipo'],
): 'primary' | 'secondary' | 'warning' | 'default' {
  if (tipo === 'medicamento') return 'secondary'
  if (tipo === 'empenhado') return 'warning'
  return 'primary'
}

export function AguardandoEmpenhoDialog({
  open,
  onClose,
  itens,
  valorTotal,
}: AguardandoEmpenhoDialogProps) {
  const porSetor = itens.reduce<Record<string, { label: string; qtd: number; valor: number }>>(
    (acc, item) => {
      const key = item.setorTipo
      const current = acc[key] ?? { label: item.setorLabel, qtd: 0, valor: 0 }
      current.qtd += 1
      current.valor += item.valor
      acc[key] = current
      return acc
    },
    {},
  )

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        Aguardando Empenho
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {itens.length} Solemp{itens.length === 1 ? '' : 's'} confeccionada
          {itens.length === 1 ? '' : 's'} — total {formatCurrency(valorTotal)}
        </Typography>
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {itens.length === 0 ? (
          <Typography color="text.secondary">
            Nenhuma Solemp confeccionada aguardando empenho no momento.
          </Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {Object.values(porSetor).map((setor) => (
                <Chip
                  key={setor.label}
                  label={`${setor.label}: ${setor.qtd} · ${formatCurrency(setor.valor)}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SOLEMP</TableCell>
                  <TableCell>Setor de origem</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell>Pedido</TableCell>
                  <TableCell align="right">Dias na etapa</TableCell>
                  <TableCell>Início</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.pedidoId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{item.solempNumero}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.setorLabel}
                        size="small"
                        color={setorColor(item.setorTipo)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{item.setorNome}</TableCell>
                    <TableCell align="right">{formatCurrency(item.valor)}</TableCell>
                    <TableCell>{item.pedidoNumero}</TableCell>
                    <TableCell align="right">{item.diasNaEtapa}</TableCell>
                    <TableCell>{formatDate(item.dataSolicitacao)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
