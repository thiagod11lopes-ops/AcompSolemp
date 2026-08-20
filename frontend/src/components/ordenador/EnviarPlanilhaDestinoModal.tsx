import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import { useEffect, useMemo, useState } from 'react'
import type { DestinoReenvioPlanilha } from '@/utils/reenviarPlanilha'
import { PARALELO_ID } from '@/utils/reenviarPlanilha'

interface EnviarPlanilhaDestinoModalProps {
  open: boolean
  pedidoNumero: string
  destinos: DestinoReenvioPlanilha[]
  defaultDestinoId: string | null
  permiteParaleloClinica?: boolean
  loading?: boolean
  onClose: () => void
  onConfirmar: (destinoIds: string[]) => void
}

export function EnviarPlanilhaDestinoModal({
  open,
  pedidoNumero,
  destinos,
  defaultDestinoId,
  loading = false,
  onClose,
  onConfirmar,
}: EnviarPlanilhaDestinoModalProps) {
  const [destinoId, setDestinoId] = useState('')
  const [paralelo, setParalelo] = useState(false)

  const destinosRadio = useMemo(
    () => destinos.filter((d) => d.id !== PARALELO_ID),
    [destinos],
  )
  const destinoParalelo = useMemo(
    () => destinos.find((d) => d.id === PARALELO_ID) ?? null,
    [destinos],
  )

  useEffect(() => {
    if (!open) return
    const initial = defaultDestinoId ?? destinosRadio[0]?.id ?? ''
    setDestinoId(initial)
    setParalelo(initial === PARALELO_ID)
  }, [open, defaultDestinoId, destinosRadio])

  const handleConfirmar = () => {
    if (paralelo && destinoParalelo) {
      onConfirmar([PARALELO_ID])
      return
    }
    if (!destinoId) return
    onConfirmar([destinoId])
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
      <DialogTitle sx={{ fontWeight: 800 }}>Enviar planilha corrigida</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Planilha <strong>{pedidoNumero}</strong> — escolha para qual setor reenviar após a
          correção. O setor que devolveu para você aparece pré-selecionado.
        </Typography>

        {destinos.length === 0 ? (
          <Alert severity="info">Nenhum setor disponível para reenvio.</Alert>
        ) : (
          <>
            {destinoParalelo ? (
              <FormControlLabel
                sx={{ mb: 1, alignItems: 'flex-start' }}
                control={
                  <Checkbox
                    checked={paralelo}
                    onChange={(e) => setParalelo(e.target.checked)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {destinoParalelo.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Envia simultaneamente para Auditoria e Confecção de Solemp.
                    </Typography>
                  </Box>
                }
              />
            ) : null}

            {!paralelo ? (
              <FormControl fullWidth>
                <RadioGroup
                  value={destinoId}
                  onChange={(event) => setDestinoId(event.target.value)}
                >
                  {destinosRadio.map((destino) => (
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
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {destino.label}
                          </Typography>
                        }
                        sx={{ alignItems: 'flex-start', mr: 0, width: '100%' }}
                      />
                    </Box>
                  ))}
                </RadioGroup>
              </FormControl>
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={loading || destinos.length === 0 || (!paralelo && !destinoId)}
          onClick={handleConfirmar}
        >
          {loading ? 'Enviando…' : 'Enviar planilha'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
