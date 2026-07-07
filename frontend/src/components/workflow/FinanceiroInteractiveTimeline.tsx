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
import PaymentsIcon from '@mui/icons-material/Payments'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { formatDate, formatDateTime } from '@/utils/format'
import {
  FINANCEIRO_ETAPA_ACOES,
  financeiroPagamentoConcluido,
  financeiroPodeRegistrarPagamento,
} from '@/utils/portal'
import { SolempEtapaBadge } from '@/components/workflow/SolempEtapaBadge'
import { resolveEtapaFromRef } from '@/utils/workflow'

interface FinanceiroInteractiveTimelineProps {
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
  onPagamento?: () => void
  registrando?: boolean
  mensagemFluxoEncerrado?: string | null
}

export function FinanceiroInteractiveTimeline({
  pedido,
  etapas,
  onPagamento,
  registrando = false,
  mensagemFluxoEncerrado = null,
}: FinanceiroInteractiveTimelineProps) {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
  const pagamentoConcluido = financeiroPagamentoConcluido(pedido, ordenadas)
  const acaoFinancas = FINANCEIRO_ETAPA_ACOES.DIV_MAT_FINANCAS
  const podeRegistrar =
    !pagamentoConcluido && financeiroPodeRegistrarPagamento(pedido.etapaAtual.chave)
  const etapasAtivasIds =
    pedido.etapasAtivasIds?.length > 0 ? pedido.etapasAtivasIds : [pedido.etapaAtualId]

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Timeline do Processo
      </Typography>

      {pagamentoConcluido && mensagemFluxoEncerrado && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {mensagemFluxoEncerrado}
        </Alert>
      )}

      {acaoFinancas && podeRegistrar && (
        <Alert
          severity="info"
          icon={<PaymentsIcon />}
          sx={{ mb: 2 }}
          action={
            onPagamento && (
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={onPagamento}
                disabled={registrando}
              >
                {registrando ? 'Registrando...' : acaoFinancas.label}
              </Button>
            )
          }
        >
          <strong>Pagamento pendente:</strong> {acaoFinancas.descricao}
          {pedido.solemp && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              SOLEMP: <strong>{pedido.solemp.numero}</strong>
            </Typography>
          )}
        </Alert>
      )}

      <Stepper orientation="vertical" nonLinear activeStep={-1}>
        {ordenadas.map((etapa) => {
          const historico = pedido.etapasHistorico.find(
            (item) =>
              item.etapaId === etapa.id ||
              resolveEtapaFromRef(item.etapaId, item.etapaNome, ordenadas)?.id === etapa.id,
          )
          const concluida = Boolean(historico?.dataConclusao) || pedido.concluido
          const atual =
            etapasAtivasIds.includes(etapa.id) &&
            !pedido.concluido &&
            !historico?.dataConclusao
          const etapaFinancas = etapa.chave === 'DIV_MAT_FINANCAS'

          return (
            <Step key={etapa.id} completed={concluida} active={atual} expanded>
              <StepLabel
                slots={{
                  stepIcon: () =>
                    concluida ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <RadioButtonUncheckedIcon color={atual ? 'info' : 'disabled'} />
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
                  {atual && etapaFinancas && (
                    <Chip label="Pagamento pendente" size="small" color="info" variant="outlined" />
                  )}
                  {concluida && etapaFinancas && pagamentoConcluido && (
                    <Chip label="Concluída" size="small" color="success" />
                  )}
                  {concluida && !etapaFinancas && (
                    <Chip label="Concluída" size="small" color="success" />
                  )}
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
                    {etapaFinancas && (
                      <Button
                        variant={pagamentoConcluido ? 'outlined' : 'contained'}
                        color={pagamentoConcluido ? 'success' : 'success'}
                        size="small"
                        sx={{ mt: 2 }}
                        onClick={pagamentoConcluido ? undefined : onPagamento}
                        disabled={pagamentoConcluido || registrando || !onPagamento}
                        startIcon={pagamentoConcluido ? <CheckCircleIcon /> : <PaymentsIcon />}
                      >
                        {pagamentoConcluido
                          ? (acaoFinancas.labelConcluido ?? 'Concluído')
                          : registrando
                            ? 'Registrando...'
                            : acaoFinancas.label}
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
