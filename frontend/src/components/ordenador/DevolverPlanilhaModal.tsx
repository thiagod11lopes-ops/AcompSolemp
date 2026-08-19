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
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import type { DestinoDevolucaoPlanilha } from '@/utils/devolverPlanilha'

interface DevolverPlanilhaModalProps {
  open: boolean
  destinos: DestinoDevolucaoPlanilha[]
  loading?: boolean
  onClose: () => void
  onConfirmar: (destino: DestinoDevolucaoPlanilha, justificativa: string) => void
}

export function DevolverPlanilhaModal({
  open,
  destinos,
  loading = false,
  onClose,
  onConfirmar,
}: DevolverPlanilhaModalProps) {
  const [destinoId, setDestinoId] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!open) return
    setDestinoId(destinos[0]?.id ?? '')
    setJustificativa('')
    setErro('')
  }, [open, destinos])

  const selecionado = destinos.find((item) => item.id === destinoId) ?? null

  const handleConfirmar = () => {
    if (!selecionado) return
    if (justificativa.trim().length < 10) {
      setErro('Descreva a justificativa com pelo menos 10 caracteres.')
      return
    }
    onConfirmar(selecionado, justificativa.trim())
  }

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
          Só é possível devolver para quem produziu e enviou esta planilha e para os setores que
          já fizeram parte desse caminho.
        </Typography>

        {destinos.length === 0 ? (
          <Alert severity="info">Não há setor anterior para devolver esta planilha.</Alert>
        ) : (
          <>
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

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Justificativa"
              placeholder="Explique o motivo da devolução"
              value={justificativa}
              onChange={(event) => {
                setJustificativa(event.target.value)
                if (erro) setErro('')
              }}
              error={Boolean(erro)}
              helperText={erro || `${justificativa.trim().length} caracteres — mínimo 10`}
              sx={{ mt: 1.5 }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={loading || !selecionado}
          onClick={handleConfirmar}
        >
          {loading ? 'Devolvendo…' : 'Devolver'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
