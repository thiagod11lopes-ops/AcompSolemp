import {
  Box,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
  Chip,
  Paper,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { formatDate, formatDateTime } from '@/utils/format'
import { calcularDiasNaEtapa, getPrazoStatusColor } from '@/utils/workflow'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { SolempEtapaBadge } from '@/components/workflow/SolempEtapaBadge'

interface ProcessTimelineProps {
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
}

export function ProcessTimeline({ pedido, etapas }: ProcessTimelineProps) {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
  const etapaAtualIndex = ordenadas.findIndex((e) => e.id === pedido.etapaAtualId)

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Timeline do Processo
      </Typography>
      <Stepper activeStep={etapaAtualIndex} orientation="vertical">
        {ordenadas.map((etapa, index) => {
          const historico = pedido.etapasHistorico.find((h) => h.etapaId === etapa.id)
          const concluida = index < etapaAtualIndex || pedido.concluido
          const atual = index === etapaAtualIndex && !pedido.concluido

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
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: atual ? 700 : 500 }}>{etapa.nome}</Typography>
                  <SolempEtapaBadge
                    etapaChave={etapa.chave}
                    numero={pedido.solemp?.numero}
                    notaFiscalNumero={pedido.notaFiscal?.numero}
                  />
                  {atual && (
                    <Chip label="Etapa atual" size="small" color="primary" variant="outlined" />
                  )}
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
                    <Typography variant="body2" color="text.secondary">
                      Dias na etapa: {dias} | Prazo: {etapa.prazoDias} dias
                    </Typography>
                    {atual && (
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
                    {historico.arquivos.length > 0 && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                        Arquivos: {historico.arquivos.join(', ')}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ pb: 2 }}>
                    Etapa pendente
                  </Typography>
                )}
              </StepContent>
            </Step>
          )
        })}
      </Stepper>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Solicitação em {formatDate(pedido.dataSolicitacao)}
      </Typography>
    </Paper>
  )
}
