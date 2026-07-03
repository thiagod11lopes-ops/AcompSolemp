import {
  Box,
  Grid,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
  Chip,
  Paper,
  Button,
  Alert,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import TouchAppIcon from '@mui/icons-material/TouchApp'
import UndoIcon from '@mui/icons-material/Undo'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { formatDate, formatDateTime } from '@/utils/format'
import { calcularDiasNaEtapa, getPrazoStatusColor } from '@/utils/workflow'
import {
  CLINICA_ETAPA_ACOES,
  ETAPAS_AGUARDANDO_SETOR,
  clinicaPodeAvancar,
} from '@/utils/portal'
import { buildTimelineBlocos } from '@/utils/timelineFlow'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { SolempEtapaBadge } from '@/components/workflow/SolempEtapaBadge'

interface ClinicaInteractiveTimelineProps {
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
  onAvancar?: () => void
  onReverter?: () => void
  podeReverter?: boolean
  avancando?: boolean
  revertendo?: boolean
  /** Clínica só visualiza após envio para Div. de Material */
  somenteLeitura?: boolean
}

export function ClinicaInteractiveTimeline({
  pedido,
  etapas,
  onAvancar,
  onReverter,
  podeReverter = false,
  avancando = false,
  revertendo = false,
  somenteLeitura = false,
}: ClinicaInteractiveTimelineProps) {
  const etapasAtivasIds =
    pedido.etapasAtivasIds?.length > 0
      ? pedido.etapasAtivasIds
      : [pedido.etapaAtualId]
  const etapasAtivas = etapas.filter((e) => etapasAtivasIds.includes(e.id))
  const podeEditar = !somenteLeitura && Boolean(onAvancar)
  const blocos = buildTimelineBlocos(etapas)

  const renderEtapa = (etapa: WorkflowEtapa, indent = false) => {
    const historico = pedido.etapasHistorico.find((h) => h.etapaId === etapa.id)
    const concluida = Boolean(historico?.dataConclusao) || pedido.concluido
    const atual = etapasAtivasIds.includes(etapa.id) && !pedido.concluido && !historico?.dataConclusao
    const podeClicar = podeEditar && atual && clinicaPodeAvancar(etapa.chave)

    let dias = 0
    let prazoStatus: 'success' | 'warning' | 'error' | 'default' = 'default'

    if (historico) {
      if (historico.dataConclusao) {
        dias = differenceInCalendarDays(
          parseISO(historico.dataConclusao),
          parseISO(historico.dataInicio),
        )
      } else if (atual) {
        dias = calcularDiasNaEtapa(pedido)
        prazoStatus = getPrazoStatusColor(pedido.prazoStatus)
      }
    }

    const acaoEtapa = CLINICA_ETAPA_ACOES[etapa.chave]

    return (
      <Step
        key={etapa.id}
        completed={concluida}
        active={atual}
        expanded
        sx={indent ? { ml: 1 } : undefined}
      >
        <StepLabel
          slots={{
            stepIcon: () =>
              concluida ? (
                <CheckCircleIcon color="success" />
              ) : (
                <RadioButtonUncheckedIcon color={atual ? 'primary' : 'disabled'} />
              ),
          }}
          onClick={
            podeClicar && onAvancar ? () => onAvancar() : undefined
          }
          sx={
            podeClicar && onAvancar
              ? { cursor: 'pointer', '&:hover .MuiTypography-root': { color: 'primary.main' } }
              : undefined
          }
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: atual ? 700 : 500 }}>{etapa.nome}</Typography>
            <SolempEtapaBadge
              etapaChave={etapa.chave}
              numero={pedido.solemp?.numero}
              notaFiscalNumero={pedido.notaFiscal?.numero}
            />
            {atual && (
              <Chip
                label={somenteLeitura ? 'Etapa atual' : 'Você está aqui'}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {concluida && <Chip label="Concluída" size="small" color="success" />}
          </Box>
        </StepLabel>
        <StepContent>
          {historico ? (
            <Box sx={{ pb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Responsável: {historico.responsavelNome ?? 'Não atribuído'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Início: {formatDateTime(historico.dataInicio)}
              </Typography>
              {historico.dataConclusao && (
                <Typography variant="body2" color="text.secondary">
                  Conclusão: {formatDateTime(historico.dataConclusao)}
                </Typography>
              )}
              {etapa.prazoDias > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Dias na etapa: {dias} | Prazo: {etapa.prazoDias} dias
                </Typography>
              )}
              {atual && etapa.prazoDias > 0 && (
                <Chip
                  label={
                    pedido.diasRestantes >= 0
                      ? `${pedido.diasRestantes} dias restantes`
                      : `${Math.abs(pedido.diasRestantes)} dias de atraso`
                  }
                  color={prazoStatus === 'default' ? 'default' : prazoStatus}
                  size="small"
                  sx={{ mt: 1 }}
                />
              )}
              {historico.observacao && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {historico.observacao}
                </Typography>
              )}

              {podeClicar && acaoEtapa && onAvancar && (
                <Button
                  variant="contained"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={onAvancar}
                  disabled={avancando}
                  startIcon={<TouchAppIcon />}
                >
                  {avancando ? 'Registrando...' : acaoEtapa.label}
                </Button>
              )}

              {atual && ETAPAS_AGUARDANDO_SETOR[etapa.chave] && (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                  {ETAPAS_AGUARDANDO_SETOR[etapa.chave]}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ pb: 2 }}>
              Etapa ainda não iniciada
            </Typography>
          )}
        </StepContent>
      </Step>
    )
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Timeline do Processo
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {somenteLeitura
          ? 'Após o envio, a Div. de Material segue em fluxo duplo: Auditoria e Confecção de Solemp ao mesmo tempo.'
          : 'Acompanhe cada etapa e clique para registrar o avanço quando sua clínica concluir a ação.'}
      </Typography>

      {etapasAtivas.length > 0 && !pedido.concluido && (
        <Alert
          severity="info"
          icon={somenteLeitura ? <HourglassEmptyIcon /> : <TouchAppIcon />}
          sx={{ mb: 2 }}
        >
          <strong>
            {etapasAtivas.length > 1 ? 'Etapas ativas em paralelo:' : 'Etapa atual:'}
          </strong>{' '}
          {etapasAtivas.map((e) => e.nome).join(' · ')}
        </Alert>
      )}

      {pedido.concluido && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Processo concluído — todas as etapas foram finalizadas.
        </Alert>
      )}

      {blocos.map((bloco) => {
        if (bloco.tipo === 'etapa') {
          return (
            <Stepper key={bloco.etapa.id} orientation="vertical" nonLinear activeStep={-1}>
              {renderEtapa(bloco.etapa)}
            </Stepper>
          )
        }

        return (
          <Box key={bloco.nome} sx={{ mb: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                color: 'primary.main',
                mt: 1,
                mb: 1.5,
                px: 1,
              }}
            >
              {bloco.nome}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, mb: 2 }}>
              Fluxo duplo em paralelo — as duas divisões avançam ao mesmo tempo após o envio da clínica.
            </Typography>
            <Grid container spacing={2}>
              {bloco.divisoes.map((divisao) => (
                <Grid key={`${bloco.nome}-${divisao.trilha}`} size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      height: '100%',
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}
                    >
                      {divisao.nome}
                    </Typography>
                    <Stepper orientation="vertical" nonLinear activeStep={-1}>
                      {divisao.etapas.map(({ etapa }) => renderEtapa(etapa, true))}
                    </Stepper>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )
      })}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Timeline iniciada em {formatDate(pedido.dataSolicitacao)} · Pedido {pedido.numero}
      </Typography>

      {!somenteLeitura && podeReverter && onReverter && !pedido.concluido && (
        <Button
          variant="outlined"
          color="warning"
          size="small"
          startIcon={<UndoIcon />}
          onClick={onReverter}
          disabled={revertendo || avancando}
          sx={{ mt: 2 }}
        >
          {revertendo ? 'Revertendo...' : 'Voltar uma etapa'}
        </Button>
      )}
    </Paper>
  )
}
