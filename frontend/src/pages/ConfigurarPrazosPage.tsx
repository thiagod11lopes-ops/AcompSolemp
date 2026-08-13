import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useUpdateWorkflowPrazos, useWorkflowEtapas } from '@/hooks/useCadastros'
import type { WorkflowEtapa } from '@/types'

export default function ConfigurarPrazosPage() {
  const theme = useTheme()
  const { data: etapasRaw = [], isLoading } = useWorkflowEtapas()
  const etapas = useMemo(
    () => etapasRaw.filter((etapa) => etapa.chave !== 'SOLICITACAO'),
    [etapasRaw],
  )
  const updatePrazos = useUpdateWorkflowPrazos()

  const [setorId, setSetorId] = useState('')
  const [dias, setDias] = useState('')
  const [feedback, setFeedback] = useState<{
    open: boolean
    severity: 'success' | 'error'
    message: string
  }>({ open: false, severity: 'success', message: '' })

  const setorSelecionado = useMemo(
    () => etapas.find((etapa) => etapa.id === setorId) ?? null,
    [etapas, setorId],
  )

  const handleSelectSetor = (id: string) => {
    setSetorId(id)
    const etapa = etapas.find((item) => item.id === id)
    setDias(etapa ? String(etapa.prazoDias) : '')
  }

  const handleAplicar = async () => {
    if (!setorSelecionado) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Selecione um setor para configurar o prazo.',
      })
      return
    }
    const prazoDias = Number(dias)
    if (!Number.isFinite(prazoDias) || prazoDias < 1) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Informe um prazo válido (mínimo 1 dia).',
      })
      return
    }

    try {
      await updatePrazos.mutateAsync([{ id: setorSelecionado.id, prazoDias }])
      setFeedback({
        open: true,
        severity: 'success',
        message: `Prazo de ${setorSelecionado.nome} definido em ${prazoDias} dia(s).`,
      })
      setSetorId('')
      setDias('')
    } catch (error) {
      setFeedback({
        open: true,
        severity: 'error',
        message: error instanceof Error ? error.message : 'Erro ao salvar prazo.',
      })
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Configurar Prazos"
        subtitle="Selecione o setor e defina o prazo em dias do card na timeline"
      />

      <Alert severity="info" sx={{ mb: 2.5 }}>
        Escolha o setor no select, informe os dias e aplique. Os prazos configurados ficam listados
        abaixo. Use valores de 1 a 365 dias.
      </Alert>

      <Paper
        sx={{
          p: 2.5,
          borderRadius: 3,
          mb: 2.5,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${theme.palette.background.paper} 55%)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ScheduleIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Adicionar / atualizar prazo
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: '1.4fr 0.8fr auto' },
            alignItems: 'start',
          }}
        >
          <FormControl fullWidth size="small">
            <InputLabel id="prazo-setor-select-label">Setor</InputLabel>
            <Select
              labelId="prazo-setor-select-label"
              id="prazo-setor-select"
              label="Setor"
              value={setorId}
              onChange={(e) => handleSelectSetor(String(e.target.value))}
            >
              {etapas.map((etapa) => (
                <MenuItem key={etapa.id} value={etapa.id}>
                  {etapa.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {setorSelecionado ? (
            <TextField
              label="Prazo (dias)"
              size="small"
              fullWidth
              value={dias}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 3)
                setDias(raw)
              }}
              placeholder="Ex.: 3"
              slotProps={{
                htmlInput: { min: 1, max: 365, inputMode: 'numeric' },
              }}
              helperText="Dias para a etapa selecionada"
            />
          ) : (
            <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
          )}

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAplicar}
            disabled={!setorSelecionado || !dias.trim() || updatePrazos.isPending}
            sx={{ height: 40, whiteSpace: 'nowrap' }}
          >
            {updatePrazos.isPending ? 'Salvando...' : 'Aplicar prazo'}
          </Button>
        </Box>

        {!setorSelecionado && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>
            Selecione um setor para liberar o campo de dias.
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
          Prazos configurados
        </Typography>

        {etapas.length === 0 ? (
          <Typography color="text.secondary">Nenhum setor disponível para prazo.</Typography>
        ) : (
          <Box sx={{ display: 'grid', gap: 1 }}>
            {etapas.map((etapa: WorkflowEtapa) => (
              <Box
                key={etapa.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  px: 1.5,
                  py: 1.1,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {etapa.nome}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 800,
                    color: 'primary.main',
                    minWidth: 72,
                    textAlign: 'right',
                  }}
                >
                  {etapa.prazoDias} {etapa.prazoDias === 1 ? 'dia' : 'dias'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

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
