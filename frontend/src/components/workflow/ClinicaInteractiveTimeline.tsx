import {
  Box,
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
}

export function ClinicaInteractiveTimeline({
  pedido,
  etapas,
  onAvancar,
  onReverter,
  podeReverter = false,
  avancando = false,
  revertendo = false,
}: ClinicaInteractiveTimelineProps) {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
  const etapaAtualIndex = ordenadas.findIndex((e) => e.id === pedido.etapaAtualId)
  const acaoAtual = CLINICA_ETAPA_ACOES[pedido.etapaAtual.chave]
  const aguardandoSetor = ETAPAS_AGUARDANDO_SETOR[pedido.etapaAtual.chave]

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Timeline do Processo
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Acompanhe cada etapa e clique para registrar o avanço quando sua clínica concluir a ação.
      </Typography>

      {acaoAtual && !pedido.concluido && (
        <Alert
          severity="info"
          icon={<TouchAppIcon />}
          sx={{ mb: 2 }}
          action={
            onAvancar && (
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={onAvancar}
                disabled={avancando}
              >
                {avancando ? 'Registrando...' : acaoAtual.label}
              </Button>
            )
          }
        >
          <strong>Etapa atual:</strong> {acaoAtual.descricao}
        </Alert>
      )}

      {aguardandoSetor && !pedido.concluido && (
        <Alert severity="warning" icon={<HourglassEmptyIcon />} sx={{ mb: 2 }}>
          {aguardandoSetor}
        </Alert>
      )}

      {pedido.concluido && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Processo concluído — todas as etapas foram finalizadas.
        </Alert>
      )}

      <Stepper activeStep={etapaAtualIndex} orientation="vertical">
        {ordenadas.map((etapa, index) => {
          const historico = pedido.etapasHistorico.find((h) => h.etapaId === etapa.id)
          const concluida = index < etapaAtualIndex || pedido.concluido
          const atual = index === etapaAtualIndex && !pedido.concluido
          const podeClicar = atual && clinicaPodeAvancar(etapa.chave)

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
          const etapaNfAnexada = etapa.chave === 'NF_ANEXADA' || etapa.chave === 'SOLEMP_ASSINADA'

          return (
            <Step key={etapa.id} completed={concluida} active={atual}>
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
                  podeClicar && etapaNfAnexada && onAvancar
                    ? () => onAvancar()
                    : undefined
                }
                sx={
                  podeClicar && etapaNfAnexada && onAvancar
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
                    <Chip label="Você está aqui" size="small" color="primary" variant="outlined" />
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
        })}
      </Stepper>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Timeline iniciada em {formatDate(pedido.dataSolicitacao)} · Pedido {pedido.numero}
      </Typography>

      {podeReverter && onReverter && !pedido.concluido && (
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
