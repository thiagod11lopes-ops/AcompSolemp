import { useMemo } from 'react'
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
import { ORDENADOR_ETAPA_ACOES } from '@/utils/portal'
import { SolempEtapaBadge } from '@/components/workflow/SolempEtapaBadge'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { PERFIL_PARA_CHAVE_ETAPA } from '@/utils/perfilEtapa'
import {
  filtrarEtapasTrilhaAuditoria,
  usaTrilhaAuditoriaOrdenador,
} from '@/utils/timelineFlow'

interface OrdenadorInteractiveTimelineProps {
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
  onAssinar?: () => void
  assinando?: boolean
  onReceberPlanilha?: () => void
  onEncaminharImh?: () => void
  planilhaRecebida?: boolean
  onReceberPlanilhaImh?: () => void
  planilhaEncaminhadaImh?: boolean
  planilhaRecebidaImh?: boolean
}

export function OrdenadorInteractiveTimeline({
  pedido,
  etapas,
  onAssinar,
  assinando = false,
  onReceberPlanilha,
  onEncaminharImh,
  planilhaRecebida = false,
  onReceberPlanilhaImh,
  planilhaEncaminhadaImh = false,
  planilhaRecebidaImh = false,
}: OrdenadorInteractiveTimelineProps) {
  const { user } = useOrdenadorAuth()
  const chavePerfil = user ? PERFIL_PARA_CHAVE_ETAPA[user.perfil] : null
  const trilhaAuditoria = usaTrilhaAuditoriaOrdenador(chavePerfil)
  const ordenadas = useMemo(() => {
    const sorted = [...etapas].sort((a, b) => a.ordem - b.ordem)
    if (trilhaAuditoria) return filtrarEtapasTrilhaAuditoria(sorted)
    return sorted
  }, [etapas, trilhaAuditoria])
  const etapasAtivasIds =
    pedido.etapasAtivasIds?.length > 0
      ? pedido.etapasAtivasIds
      : [pedido.etapaAtualId]

  const etapaDoPerfil = ordenadas.find(
    (e) => etapasAtivasIds.includes(e.id) && e.chave === chavePerfil,
  )
  const acaoAtual = etapaDoPerfil
    ? ORDENADOR_ETAPA_ACOES[etapaDoPerfil.chave]
    : undefined
  const isAuditoriaAtiva = etapaDoPerfil?.chave === 'DIV_MAT_AUDITORIA'
  const isContabilidadeAtiva = etapaDoPerfil?.chave === 'DIV_MAT_CONTABILIDADE_IMH'
  const usaFluxoPlanilha = isAuditoriaAtiva || isContabilidadeAtiva

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Timeline do Processo
      </Typography>

      {acaoAtual && etapaDoPerfil && (
        <Alert
          severity="warning"
          icon={<DrawIcon />}
          sx={{ mb: 2 }}
          action={
            !usaFluxoPlanilha && onAssinar ? (
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={onAssinar}
                disabled={assinando}
              >
                {assinando ? 'Processando...' : acaoAtual.label}
              </Button>
            ) : undefined
          }
        >
          <strong>Ação necessária:</strong> {acaoAtual.descricao}
          {isAuditoriaAtiva && onReceberPlanilha && onEncaminharImh && (
            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={onReceberPlanilha}
                disabled={assinando}
              >
                Receber Planilha
              </Button>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={onEncaminharImh}
                disabled={assinando || !planilhaRecebida}
              >
                Encaminhar ao IMH
              </Button>
              {!planilhaRecebida && (
                <Typography variant="caption" color="text.secondary">
                  Abra a planilha antes de encaminhar ao IMH.
                </Typography>
              )}
            </Box>
          )}
          {isContabilidadeAtiva && onReceberPlanilhaImh && onAssinar && (
            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={onReceberPlanilhaImh}
                disabled={assinando || !planilhaEncaminhadaImh}
              >
                Receber Planilha
              </Button>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                onClick={onAssinar}
                disabled={assinando || !planilhaRecebidaImh}
              >
                {acaoAtual.label}
              </Button>
              {!planilhaEncaminhadaImh && (
                <Typography variant="caption" color="text.secondary">
                  Aguardando encaminhamento pela Auditoria.
                </Typography>
              )}
              {planilhaEncaminhadaImh && !planilhaRecebidaImh && (
                <Typography variant="caption" color="text.secondary">
                  Abra a planilha antes de concluir a Contabilidade/IMH.
                </Typography>
              )}
            </Box>
          )}
          {pedido.solemp && !trilhaAuditoria && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              SOLEMP: <strong>{pedido.solemp.numero}</strong>
            </Typography>
          )}
        </Alert>
      )}

      <Stepper orientation="vertical" nonLinear activeStep={-1}>
        {ordenadas.map((etapa) => {
          const historico = pedido.etapasHistorico.find((h) => h.etapaId === etapa.id)
          const concluida = Boolean(historico?.dataConclusao) || pedido.concluido
          const atual =
            etapasAtivasIds.includes(etapa.id) &&
            !pedido.concluido &&
            !historico?.dataConclusao
          const minhaEtapa = etapaDoPerfil?.id === etapa.id

          return (
            <Step key={etapa.id} completed={concluida} active={atual} expanded>
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
                    <Chip
                      label={minhaEtapa ? 'Sua etapa' : 'Etapa ativa'}
                      size="small"
                      color="warning"
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
                    {minhaEtapa && !usaFluxoPlanilha && onAssinar && (
                      <Button
                        variant="contained"
                        color="warning"
                        size="small"
                        sx={{ mt: 2 }}
                        onClick={onAssinar}
                        disabled={assinando}
                        startIcon={<DrawIcon />}
                      >
                        {assinando ? 'Processando...' : acaoAtual?.label ?? 'Concluir etapa'}
                      </Button>
                    )}
                    {minhaEtapa && isAuditoriaAtiva && onReceberPlanilha && onEncaminharImh && (
                      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={onReceberPlanilha}
                          disabled={assinando}
                        >
                          Receber Planilha
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          onClick={onEncaminharImh}
                          disabled={assinando || !planilhaRecebida}
                        >
                          Encaminhar ao IMH
                        </Button>
                      </Box>
                    )}
                    {minhaEtapa && isContabilidadeAtiva && onReceberPlanilhaImh && onAssinar && (
                      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={onReceberPlanilhaImh}
                          disabled={assinando || !planilhaEncaminhadaImh}
                        >
                          Receber Planilha
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          onClick={onAssinar}
                          disabled={assinando || !planilhaRecebidaImh}
                        >
                          {acaoAtual?.label ?? 'Concluir Contabilidade/IMH'}
                        </Button>
                      </Box>
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
