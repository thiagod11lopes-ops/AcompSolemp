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
import { PRAZO_CORRECAO_PADRAO_DIAS } from '@/types'

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
  const [alertaDias, setAlertaDias] = useState('')
  const [correcaoDias, setCorrecaoDias] = useState('')
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
    setAlertaDias(etapa ? String(etapa.alertaVencimentoDias ?? 2) : '')
    setCorrecaoDias(
      etapa ? String(etapa.prazoCorrecaoDias ?? PRAZO_CORRECAO_PADRAO_DIAS) : '',
    )
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
    const alertaVencimentoDias = Number(alertaDias)
    if (!Number.isFinite(alertaVencimentoDias) || alertaVencimentoDias < 0) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Informe Prox do vencimento (dias restantes para o alerta).',
      })
      return
    }
    if (alertaVencimentoDias > prazoDias) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Prox do vencimento não pode ser maior que os dias para vencer.',
      })
      return
    }
    const prazoCorrecaoDias = Number(correcaoDias)
    if (!Number.isFinite(prazoCorrecaoDias) || prazoCorrecaoDias < 0) {
      setFeedback({
        open: true,
        severity: 'error',
        message: 'Informe o Prazo de correção em dias (0 ou mais).',
      })
      return
    }

    try {
      await updatePrazos.mutateAsync([
        { id: setorSelecionado.id, prazoDias, alertaVencimentoDias, prazoCorrecaoDias },
      ])
      setFeedback({
        open: true,
        severity: 'success',
        message: `${setorSelecionado.nome}: ${prazoDias}d p/ vencer · Prox ${alertaVencimentoDias}d · Correção ${prazoCorrecaoDias}d.`,
      })
      setSetorId('')
      setDias('')
      setAlertaDias('')
      setCorrecaoDias('')
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
        subtitle="Prazos por setor, Prox do vencimento e Prazo de correção após devolução"
        titleVariant="h6"
      />

      <Box
        sx={{
          maxWidth: 980,
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
                MenuProps={{
                  slotProps: { paper: { sx: { maxHeight: 320 } } },
                }}
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
                display: setorSelecionado ? 'block' : 'none',
                minWidth: 0,
                flex: { sm: '1 1 420px' },
                pt: 0.75,
              }}
            >
              {setorSelecionado ? (
                <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <TextField
                    label="Prazo da etapa"
                    size="small"
                    value={dias}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 3)
                      setDias(raw)
                    }}
                    placeholder="3"
                    autoFocus
                    sx={{ ...fieldSx, width: { xs: '100%', sm: 140 } }}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: {
                        min: 1,
                        max: 365,
                        inputMode: 'numeric',
                        style: { textAlign: 'center', fontWeight: 700 },
                      },
                    }}
                  />
                  <TextField
                    label="Prox do vencimento"
                    size="small"
                    value={alertaDias}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 3)
                      setAlertaDias(raw)
                    }}
                    placeholder="2"
                    helperText="Dias restantes p/ alerta"
                    sx={{ ...fieldSx, width: { xs: '100%', sm: 168 } }}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: {
                        min: 0,
                        max: 365,
                        inputMode: 'numeric',
                        style: { textAlign: 'center', fontWeight: 700 },
                      },
                    }}
                  />
                  <TextField
                    label="Prazo de correção"
                    size="small"
                    value={correcaoDias}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 3)
                      setCorrecaoDias(raw)
                    }}
                    placeholder="3"
                    helperText="Após devolução da planilha"
                    sx={{ ...fieldSx, width: { xs: '100%', sm: 168 } }}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: {
                        min: 0,
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
                    disabled={
                      !dias.trim() ||
                      !alertaDias.trim() ||
                      !correcaoDias.trim() ||
                      updatePrazos.isPending
                    }
                    sx={{
                      height: 38,
                      px: 1.5,
                      mt: { xs: 0, sm: '1px' },
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
              Selecione o setor para informar prazo da etapa, Prox do vencimento e Prazo de correção.
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
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 0.35,
                      flexShrink: 0,
                    }}
                  >
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
                      {etapa.prazoDias}d p/ vencer
                    </Box>
                    <Box
                      sx={{
                        px: 0.9,
                        py: 0.35,
                        borderRadius: 999,
                        bgcolor: alpha(theme.palette.warning.main, 0.12),
                        color: 'warning.dark',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        letterSpacing: 0.2,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Prox {etapa.alertaVencimentoDias ?? 2}d
                    </Box>
                    <Box
                      sx={{
                        px: 0.9,
                        py: 0.35,
                        borderRadius: 999,
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        color: 'error.dark',
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        letterSpacing: 0.2,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Correção {etapa.prazoCorrecaoDias ?? PRAZO_CORRECAO_PADRAO_DIAS}d
                    </Box>
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
