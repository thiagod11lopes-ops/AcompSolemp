import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { EmpenhadoMesTotal } from '@/types'
import { formatCurrency } from '@/utils/format'

interface EmpenhadoMesFiltroDialogProps {
  open: boolean
  onClose: () => void
  meses: EmpenhadoMesTotal[]
  mesSelecionado: string
  onSelectMes: (mesChave: string) => void
}

export function EmpenhadoMesFiltroDialog({
  open,
  onClose,
  meses,
  mesSelecionado,
  onSelectMes,
}: EmpenhadoMesFiltroDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 6 }}>
        Empenhado por mês
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Selecione o mês para ver o total empenhado
        </Typography>
        <IconButton
          aria-label="Fechar"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {meses.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2 }}>
            Nenhum empenho registrado ainda.
          </Typography>
        ) : (
          <List disablePadding>
            {meses.map((mes) => (
              <ListItemButton
                key={mes.mesChave}
                selected={mes.mesChave === mesSelecionado}
                onClick={() => {
                  onSelectMes(mes.mesChave)
                  onClose()
                }}
              >
                <ListItemText
                  primary={mes.mesLabel}
                  secondary={`${mes.quantidade} empenho${mes.quantidade === 1 ? '' : 's'} · ${formatCurrency(mes.valor)}`}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  )
}
