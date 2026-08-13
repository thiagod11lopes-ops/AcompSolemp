import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useUpdateWorkflowPrazos, useWorkflowEtapas } from '@/hooks/useCadastros'
import { TIMELINE_ETAPA_META } from '@/utils/timelineFlow'
import type { WorkflowEtapa } from '@/types'

function grupoEtapa(etapa: WorkflowEtapa): string {
  const meta = TIMELINE_ETAPA_META[etapa.chave]
  if (!meta?.grupo) return 'Solicitação'
  if (meta.divisao) return `${meta.grupo} — ${meta.divisao}`
  return meta.grupo
}

export default function ConfigurarPrazosPage() {
  const theme = useTheme()
  const { data: etapas = [], isLoading } = useWorkflowEtapas()
  const updatePrazos = useUpdateWorkflowPrazos()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<{
    open: boolean
    severity: 'success' | 'error'
    message: string
  }>({ open: false, severity: 'success', message: '' })

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const etapa of etapas) {
      next[etapa.id] = String(etapa.prazoDias)
    }
    setDraft(next)
  }, [etapas])

  const grupos = useMemo(() => {
    const mapa = new Map<string, WorkflowEtapa[]>()
    for (const etapa of etapas) {
      const grupo = grupoEtapa(etapa)
      const lista = mapa.get(grupo) ?? []
      lista.push(etapa)
      mapa.set(grupo, lista)
    }
    return Array.from(mapa.entries())
  }, [etapas])

  const dirty = useMemo(() => {
    return etapas.some((etapa) => {
      const valor = Number(draft[etapa.id])
      return Number.isFinite(valor) && valor !== etapa.prazoDias
    })
  }, [etapas, draft])

  const handleSave = async () => {
    try {
      const prazos = etapas.map((etapa) => ({
        id: etapa.id,
        prazoDias: Number(draft[etapa.id]),
      }))
      for (const item of prazos) {
        if (!Number.isFinite(item.prazoDias) || item.prazoDias < 1) {
          throw new Error('Informe um prazo válido (mínimo 1 dia) para todas as etapas.')
        }
      }
      await updatePrazos.mutateAsync(prazos)
      setFeedback({
        open: true,
        severity: 'success',
        message: 'Prazos da timeline atualizados com sucesso.',
      })
    } catch (error) {
      setFeedback({
        open: true,
        severity: 'error',
        message: error instanceof Error ? error.message : 'Erro ao salvar prazos.',
      })
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Configurar Prazos"
        subtitle="Defina o prazo em dias de cada card da timeline"
        action={
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!dirty || updatePrazos.isPending}
          >
            {updatePrazos.isPending ? 'Salvando...' : 'Salvar prazos'}
          </Button>
        }
      />

      <Alert severity="info" sx={{ mb: 2.5 }}>
        O prazo controla o acompanhamento de atraso de cada etapa. Use valores de 1 a 365 dias.
      </Alert>

      <Box sx={{ display: 'grid', gap: 2 }}>
        {grupos.map(([grupo, itens]) => (
          <Paper
            key={grupo}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ScheduleIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {grupo}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
              }}
            >
              {itens.map((etapa) => (
                <Box
                  key={etapa.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                    border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.25 }}>
                    {etapa.chave === 'SOLICITACAO' ? 'Solicitação da Clínica' : etapa.nome}
                  </Typography>
                  <TextField
                    label="Prazo (dias)"
                    type="number"
                    size="small"
                    fullWidth
                    value={draft[etapa.id] ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 3)
                      setDraft((prev) => ({ ...prev, [etapa.id]: raw }))
                    }}
                    slotProps={{
                      htmlInput: { min: 1, max: 365, inputMode: 'numeric' },
                    }}
                    helperText="Número de dias para a etapa"
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>

      <Snackbar
        open={feedback.open}
        autoHideDuration={4000}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={feedback.severity}
          variant="filled"
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </>
  )
}
