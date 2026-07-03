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
import DrawIcon from '@mui/icons-material/Draw'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { formatDate, formatDateTime } from '@/utils/format'
import { ORDENADOR_ETAPA_ACOES, ordenadorPodeAssinar } from '@/utils/portal'
import { SolempEtapaBadge } from '@/components/workflow/SolempEtapaBadge'

interface OrdenadorInteractiveTimelineProps {
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
  onAssinar?: () => void
  assinando?: boolean
}

export function OrdenadorInteractiveTimeline({
  pedido,
  etapas,
  onAssinar,
  assinando = false,
}: OrdenadorInteractiveTimelineProps) {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
  const etapaAtualIndex = ordenadas.findIndex((e) => e.id === pedido.etapaAtualId)
  const acaoAtual = ORDENADOR_ETAPA_ACOES[pedido.etapaAtual.chave]
  const podeAssinar = ordenadorPodeAssinar(pedido.etapaAtual.chave)

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Timeline do Processo
      </Typography>

      {acaoAtual && podeAssinar && (
        <Alert
          severity="warning"
          icon={<DrawIcon />}
          sx={{ mb: 2 }}
          action={
            onAssinar && (
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={onAssinar}
                disabled={assinando}
              >
                {assinando ? 'Assinando...' : acaoAtual.label}
              </Button>
            )
          }
        >
          <strong>Ação necessária:</strong> {acaoAtual.descricao}
          {pedido.solemp && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              SOLEMP: <strong>{pedido.solemp.numero}</strong>
            </Typography>
          )}
        </Alert>
      )}

      <Stepper activeStep={etapaAtualIndex} orientation="vertical">
        {ordenadas.map((etapa, index) => {
          const historico = pedido.etapasHistorico.find((h) => h.etapaId === etapa.id)
          const concluida = index < etapaAtualIndex || pedido.concluido
          const atual = index === etapaAtualIndex && !pedido.concluido

          return (
            <Step key={etapa.id} completed={concluida} active={atual}>
              <StepLabel
                slots={{
                  stepIcon: () =>
                    concluida ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <RadioButtonUncheckedIcon color={atual ? 'warning' : 'disabled'} />
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
                    <Chip label="Aguardando assinatura" size="small" color="warning" variant="outlined" />
                  )}
                  {concluida && <Chip label="Concluída" size="small" color="success" />}
                </Box>
              </StepLabel>
              <StepContent>
                {historico ? (
                  <Box sx={{ pb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Início: {formatDateTime(historico.dataInicio)}
                    </Typography>
                    {historico.dataConclusao && (
                      <Typography variant="body2" color="text.secondary">
                        Conclusão: {formatDateTime(historico.dataConclusao)}
                      </Typography>
                    )}
                    {historico.observacao && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {historico.observacao}
                      </Typography>
                    )}
                    {atual && podeAssinar && onAssinar && (
                      <Button
                        variant="contained"
                        color="warning"
                        size="small"
                        sx={{ mt: 2 }}
                        onClick={onAssinar}
                        disabled={assinando}
                        startIcon={<DrawIcon />}
                      >
                        {assinando ? 'Assinando...' : acaoAtual?.label ?? 'Assinar SOLEMP'}
                      </Button>
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
        Pedido {pedido.numero} · {pedido.clinica.nome} · {formatDate(pedido.dataSolicitacao)}
      </Typography>
    </Paper>
  )
}
