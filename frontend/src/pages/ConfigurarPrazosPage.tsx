import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
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
        message: `${setorSelecionado.nome}: ${prazoDias} dia(s).`,
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

  const fieldSx = {
    '& .MuiInputBase-root': {
      fontSize: '0.82rem',
      borderRadius: 2,
      minHeight: 38,
    },
    '& .MuiInputLabel-root': { fontSize: '0.78rem' },
    '& .MuiFormHelperText-root': { mx: 0.25, mt: 0.4, fontSize: '0.68rem' },
  }

  return (
    <>
      <PageHeader
        title="Configurar Prazos"
        subtitle="Prazos em dias por setor da timeline"
        titleVariant="h6"
      />

      <Box
        sx={{
          maxWidth: 720,
          display: 'grid',
          gap: 2.25,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 2.5,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
            background: `
              linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 42%),
              ${theme.palette.background.paper}
            `,
            px: 2,
            py: 1.75,
          }}
        >
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              fontWeight: 800,
              letterSpacing: 1.1,
              color: 'text.secondary',
              lineHeight: 1.2,
              mb: 1.25,
            }}
          >
            Novo prazo
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              gap: 1,
            }}
          >
            <FormControl size="small" sx={{ ...fieldSx, width: { xs: '100%', sm: 260 } }}>
              <InputLabel id="prazo-setor-select-label">Setor</InputLabel>
              <Select
                labelId="prazo-setor-select-label"
                id="prazo-setor-select"
                label="Setor"
                value={setorId}
                onChange={(e) => handleSelectSetor(String(e.target.value))}
                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
              >
                {etapas.map((etapa) => (
                  <MenuItem key={etapa.id} value={etapa.id} sx={{ fontSize: '0.82rem' }}>
                    {etapa.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box
              sx={{
                overflow: 'hidden',
                maxWidth: setorSelecionado ? 220 : 0,
                opacity: setorSelecionado ? 1 : 0,
                transition: 'max-width 220ms ease, opacity 180ms ease',
              }}
            >
              {setorSelecionado ? (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    label="Dias"
                    size="small"
                    value={dias}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 3)
                      setDias(raw)
                    }}
                    placeholder="3"
                    autoFocus
                    sx={{ ...fieldSx, width: 88 }}
                    slotProps={{
                      htmlInput: {
                        min: 1,
                        max: 365,
                        inputMode: 'numeric',
                        style: { textAlign: 'center', fontWeight: 700 },
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    disableElevation
                    startIcon={<AddRoundedIcon sx={{ fontSize: 16 }} />}
                    onClick={handleAplicar}
                    disabled={!dias.trim() || updatePrazos.isPending}
                    sx={{
                      height: 38,
                      px: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {updatePrazos.isPending ? '…' : 'Aplicar'}
                  </Button>
                </Box>
              ) : null}
            </Box>
          </Box>

          {!setorSelecionado && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1, fontSize: '0.7rem' }}
            >
              Selecione o setor para informar os dias.
            </Typography>
          )}
        </Box>

        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              mb: 1,
            }}
          >
            <Typography
              variant="overline"
              sx={{ fontWeight: 800, letterSpacing: 1.1, color: 'text.secondary' }}
            >
              Configurados
            </Typography>
            <Chip
              size="small"
              label={`${etapas.length}`}
              sx={{ height: 22, fontWeight: 800, fontSize: '0.7rem' }}
            />
          </Box>

          {etapas.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              Nenhum setor disponível.
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 0.75,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              }}
            >
              {etapas.map((etapa: WorkflowEtapa, index) => (
                <Box
                  key={etapa.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.25,
                    py: 0.9,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
                    bgcolor: alpha(theme.palette.background.paper, 0.7),
                    transition: 'border-color 160ms ease, transform 160ms ease',
                    animation: 'prazoFadeIn 320ms ease both',
                    animationDelay: `${index * 35}ms`,
                    '@keyframes prazoFadeIn': {
                      from: { opacity: 0, transform: 'translateY(4px)' },
                      to: { opacity: 1, transform: 'translateY(0)' },
                    },
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.35),
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1.5,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                    }}
                  >
                    <TimerOutlinedIcon sx={{ fontSize: 15 }} />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      lineHeight: 1.25,
                    }}
                  >
                    {etapa.nome}
                  </Typography>
                  <Box
                    sx={{
                      px: 0.9,
                      py: 0.35,
                      borderRadius: 999,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      letterSpacing: 0.2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {etapa.prazoDias}d
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <Snackbar
        open={feedback.open}
        autoHideDuration={3200}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={feedback.severity}
          variant="filled"
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
          sx={{ fontWeight: 700, fontSize: '0.82rem' }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </>
  )
}
