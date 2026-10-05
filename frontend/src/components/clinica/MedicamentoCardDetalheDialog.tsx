import {
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
import type { PmeCardDetalhe } from '@/utils/medicamentoBalanco'

interface MedicamentoCardDetalheDialogProps {
  detalhe: PmeCardDetalhe | null
  onClose: () => void
}

export function MedicamentoCardDetalheDialog({
  detalhe,
  onClose,
}: MedicamentoCardDetalheDialogProps) {
  const linhas = detalhe?.linhas ?? []

  return (
    <Dialog open={Boolean(detalhe)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
        {detalhe?.titulo}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
          {detalhe?.descricao} {linhas.length === 1 ? '1 registro.' : `${linhas.length} registros.`}
        </Typography>
        <IconButton aria-label="Fechar" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: '70vh' }}>
        {linhas.length === 0 ? (
          <Typography color="text.secondary">Nenhum registro para este indicador.</Typography>
        ) : (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {detalhe?.colunas.map((coluna) => (
                  <TableCell key={coluna} sx={{ fontWeight: 800 }}>
                    {coluna}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {linhas.map((linha, index) => (
                <TableRow key={`${linha[0]}-${index}`} hover>
                  {linha.map((celula, celulaIndex) => (
                    <TableCell key={`${celulaIndex}-${celula}`} sx={{ whiteSpace: celulaIndex === linha.length - 1 ? 'normal' : 'nowrap' }}>
                      {celula}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
