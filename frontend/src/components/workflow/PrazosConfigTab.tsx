import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Slider,
  TextField,
  Typography,
  Divider,
} from '@mui/material'
import ScheduleIcon from '@mui/icons-material/Schedule'
import SaveIcon from '@mui/icons-material/Save'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { useGestorAuth } from '@/contexts/AuthContext'
import { workflowService } from '@/services/cadastroService'
import { getRoleLabel, resetAppData } from '@/mocks/seed'
import { hasPermission } from '@/utils/permissions'
import type { WorkflowEtapa } from '@/types'

const PRAZO_MAX = 30

export function PrazosConfigTab() {
  const { user } = useGestorAuth()
  const { data: etapas = [], isLoading } = useWorkflowEtapas()
  const [localEtapas, setLocalEtapas] = useState<WorkflowEtapa[] | null>(null)
  const [saved, setSaved] = useState(false)
  const queryClient = useQueryClient()

  const canEdit = user ? hasPermission(user.perfil, 'workflow:write') : false
  const current = localEtapas ?? etapas
  const etapasAtivas = current.filter((e) => e.ativo && e.chave !== 'ENCERRADO')

  const totalDias = etapasAtivas.reduce((acc, e) => acc + e.prazoDias, 0)

  const saveMutation = useMutation({
    mutationFn: () => workflowService.saveEtapas(current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-etapas'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setLocalEtapas(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const updatePrazo = (id: string, prazoDias: number) => {
    const valor = Math.max(0, Math.min(PRAZO_MAX, prazoDias))
    setLocalEtapas(current.map((e) => (e.id === id ? { ...e, prazoDias: valor } : e)))
  }

  const handleReset = () => {
    resetAppData()
    queryClient.invalidateQueries()
    setLocalEtapas(null)
    window.location.reload()
  }

  if (isLoading) return <LoadingSpinner minHeight={200} />

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Defina <strong>quantos dias</strong> cada etapa pode permanecer em andamento antes de
        vencer. O sistema calcula automaticamente o status de cada processo com base nesses prazos.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, height: '100%' }}>
            <CheckCircleIcon color="success" />
            <Box>
              <Typography variant="body2" color="text.secondary">
                No prazo
              </Typography>
              <Typography variant="caption">
                Mais de 2 dias restantes para vencer
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, height: '100%' }}>
            <WarningAmberIcon color="warning" />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Próximo do vencimento
              </Typography>
              <Typography variant="caption">Faltam 2 dias ou menos</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, height: '100%' }}>
            <ErrorIcon color="error" />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Atrasado
              </Typography>
              <Typography variant="caption">Prazo da etapa ultrapassado</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Prazos salvos com sucesso! Os indicadores dos processos serão recalculados.
        </Alert>
      )}

      {!canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Visualização dos prazos configurados. O gestor pode alterar os valores abaixo.
        </Alert>
      )}

      <Grid container spacing={2}>
        {etapasAtivas.map((etapa) => (
          <Grid key={etapa.id} size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {etapa.ordem}. {etapa.nome}
                  </Typography>
                  <Chip
                    icon={<ScheduleIcon />}
                    label={`${etapa.prazoDias} dia${etapa.prazoDias !== 1 ? 's' : ''}`}
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Responsável: {getRoleLabel(etapa.perfilResponsavel)} · Vence após{' '}
                  <strong>{etapa.prazoDias} dias</strong> na etapa
                </Typography>

                {canEdit ? (
                  <Box sx={{ px: 1 }}>
                    <Slider
                      value={etapa.prazoDias}
                      onChange={(_, value) => updatePrazo(etapa.id, value as number)}
                      min={0}
                      max={PRAZO_MAX}
                      step={1}
                      marks={[
                        { value: 0, label: '0' },
                        { value: 7, label: '7' },
                        { value: 15, label: '15' },
                        { value: 30, label: '30' },
                      ]}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(v) => `${v} dias`}
                    />
                    <TextField
                      type="number"
                      size="small"
                      label="Prazo em dias"
                      value={etapa.prazoDias}
                      onChange={(e) => updatePrazo(etapa.id, Number(e.target.value))}
                      slotProps={{ htmlInput: { min: 0, max: PRAZO_MAX } }}
                      sx={{ mt: 1, width: 140 }}
                    />
                  </Box>
                ) : (
                  <Typography variant="body2">
                    Prazo configurado: <strong>{etapa.prazoDias} dias</strong>
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Prazo total do fluxo (etapas ativas)
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {totalDias} dias
          </Typography>
        </Box>

        {canEdit && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || localEtapas === null}
            >
              Salvar prazos
            </Button>
            <Button variant="outlined" color="warning" onClick={handleReset}>
              Resetar dados demo
            </Button>
          </Box>
        )}
      </Paper>

      {canEdit && localEtapas === null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Altere um prazo acima para habilitar o botão de salvar.
        </Typography>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2" gutterBottom>
        Referência padrão
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Solicitação: 2 dias · SOLEMP: 3 dias · Assinatura: 5 dias · Financeiro: 4 dias ·
        Pagamento: 3 dias
      </Typography>
    </Box>
  )
}
