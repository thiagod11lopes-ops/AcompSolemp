import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import type { DestinoDevolucaoPlanilha } from '@/utils/devolverPlanilha'

interface DevolverPlanilhaModalProps {
  open: boolean
  destinos: DestinoDevolucaoPlanilha[]
  loading?: boolean
  onClose: () => void
  onConfirmar: (destino: DestinoDevolucaoPlanilha) => void
}

export function DevolverPlanilhaModal({
  open,
  destinos,
  loading = false,
  onClose,
  onConfirmar,
}: DevolverPlanilhaModalProps) {
  const [destinoId, setDestinoId] = useState('')

  useEffect(() => {
    if (!open) return
    setDestinoId(destinos[0]?.id ?? '')
  }, [open, destinos])

  const selecionado = destinos.find((item) => item.id === destinoId) ?? null

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        root: { sx: { zIndex: (theme) => theme.zIndex.modal + 8 } },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>Devolver planilha</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Escolha o setor do caminho percorrido pela planilha. Clínica e Medicamento também podem
          receber a devolução e serão notificados.
        </Typography>

        {destinos.length === 0 ? (
          <Alert severity="info">Não há setor anterior para devolver esta planilha.</Alert>
        ) : (
          <FormControl fullWidth>
            <RadioGroup
              value={destinoId}
              onChange={(event) => setDestinoId(event.target.value)}
            >
              {destinos.map((destino) => (
                <Box
                  key={destino.id}
                  sx={{
                    border: 1,
                    borderColor: destinoId === destino.id ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.5,
                    mb: 1,
                  }}
                >
                  <FormControlLabel
                    value={destino.id}
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {destino.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {destino.detalhe}
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', mr: 0, width: '100%' }}
                  />
                </Box>
              ))}
            </RadioGroup>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={loading || !selecionado}
          onClick={() => selecionado && onConfirmar(selecionado)}
        >
          {loading ? 'Devolvendo…' : 'Devolver'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
