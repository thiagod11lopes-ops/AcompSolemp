import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogContent,
  DialogTitle,
  alpha,
  useTheme,
} from '@mui/material'
import UndoIcon from '@mui/icons-material/Undo'
import CheckIcon from '@mui/icons-material/Check'
import ReplyIcon from '@mui/icons-material/Reply'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import {
  useReversoes,
  useMarcarReversaoCiente,
  useResponderReversao,
} from '@/hooks/useReversoes'
import { formatDateTime } from '@/utils/format'
import type { ReversaoTimeline } from '@/types'

const statusLabel: Record<ReversaoTimeline['status'], { label: string; color: 'warning' | 'success' | 'info' }> = {
  PENDENTE: { label: 'Pendente', color: 'warning' },
  CIENTE: { label: 'Ciência registrada', color: 'success' },
  RESPONDIDO: { label: 'Respondido', color: 'info' },
}

export default function GestorReversoesPage() {
  const theme = useTheme()
  const { data: reversoes = [], isLoading } = useReversoes()
  const marcarCiente = useMarcarReversaoCiente()
  const responder = useResponderReversao()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<ReversaoTimeline | null>(null)
  const [resposta, setResposta] = useState('')

  const handleResponder = () => {
    if (!selected || resposta.trim().length < 5) return
    responder.mutate(
      { reversaoId: selected.id, resposta: resposta.trim() },
      {
        onSuccess: () => {
          setDialogOpen(false)
          setResposta('')
          setSelected(null)
        },
      },
    )
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Reversões de Timeline"
        subtitle="Clínicas que voltaram etapas — visualize, responda ou registre ciência"
      />

      {reversoes.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Nenhuma reversão registrada.</Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {reversoes.map((rev) => {
            const st = statusLabel[rev.status]
            return (
              <Card
                key={rev.id}
                variant="outlined"
                sx={{
                  borderLeft: 4,
                  borderColor:
                    rev.status === 'PENDENTE' ? 'warning.main' : 'success.main',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {rev.pedidoNumero} — {rev.clinicaNome}
                    </Typography>
                    <Chip label={st.label} color={st.color} size="small" />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Chip label={rev.etapaDeNome} size="small" color="error" variant="outlined" />
                    <UndoIcon fontSize="small" />
                    <Chip label={rev.etapaParaNome} size="small" color="primary" variant="outlined" />
                  </Box>

                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>{rev.usuarioNome}</strong> · {formatDateTime(rev.data)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.warning.main, 0.08),
                      mb: 2,
                    }}
                  >
                    {rev.motivo}
                  </Typography>

                  {rev.respostaGestor && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      <strong>Resposta ({rev.gestorNome}):</strong> {rev.respostaGestor}
                    </Typography>
                  )}

                  {rev.status === 'PENDENTE' && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckIcon />}
                        onClick={() => marcarCiente.mutate(rev.id)}
                        disabled={marcarCiente.isPending}
                      >
                        OK — Situação compreendida
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ReplyIcon />}
                        onClick={() => {
                          setSelected(rev)
                          setDialogOpen(true)
                        }}
                      >
                        Responder
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Responder reversão — {selected?.pedidoNumero}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Motivo da clínica: {selected?.motivo}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Sua resposta"
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleResponder}
              disabled={resposta.trim().length < 5 || responder.isPending}
            >
              Enviar resposta
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
}
