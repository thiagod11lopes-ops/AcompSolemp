import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Grid,
  Paper,
  Typography,
  Button,
  Chip,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { StatusChip } from '@/components/common/StatusChip'
import { ClinicaInteractiveTimeline } from '@/components/workflow/ClinicaInteractiveTimeline'
import { useDemoPedido, usePedido } from '@/hooks/usePedidos'
import { useDemoHistorico, useDemoWorkflowEtapas, useHistorico, useWorkflowEtapas } from '@/hooks/useCadastros'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { resolveEtapaNomeExibicao } from '@/utils/timelineFlow'
import { formatCurrency, formatDate, formatDateTime, formatNip } from '@/utils/format'

export default function GestorTimelineDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isDemo, navigatePortal } = usePortalPaths()
  const fonteDemo = isDemo || searchParams.get('fonte') === 'demo'
  const { data: pedidoOrg, isLoading: loadingOrg } = usePedido(id)
  const { data: pedidoDemo, isLoading: loadingDemo } = useDemoPedido(id)
  const pedido = fonteDemo ? pedidoDemo : pedidoOrg
  const isLoading = fonteDemo ? loadingDemo : loadingOrg
  const { data: etapasOrg = [] } = useWorkflowEtapas()
  const { data: etapasDemo = [] } = useDemoWorkflowEtapas()
  const etapas = fonteDemo ? etapasDemo : etapasOrg
  const { data: historicoOrg = [] } = useHistorico(id)
  const { data: historicoDemo = [] } = useDemoHistorico(id)
  const historico = fonteDemo ? historicoDemo : historicoOrg

  const voltar = () => {
    if (isDemo) {
      navigatePortal('/gestor/timeline')
      return
    }
    if (fonteDemo) {
      navigate('/gestor/timeline', { state: { fonte: 'demonstracao' } })
      return
    }
    navigate('/gestor/timeline')
  }

  if (isLoading) return <LoadingSpinner />
  if (!pedido) {
    return (
      <Box>
        <Typography>Timeline não encontrada.</Typography>
        <Button onClick={voltar} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    )
  }

  const etapasAtivas = pedido.etapasAtivasIds?.length
    ? etapas.filter((e) => pedido.etapasAtivasIds.includes(e.id))
    : [pedido.etapaAtual]

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={voltar}
        sx={{ mb: 2 }}
      >
        Voltar às timelines
      </Button>

      <PageHeader
        title={`Timeline — ${pedido.numero}`}
        titleVariant="h6"
        subtitle={`${pedido.clinica.nome} · ${pedido.empresa.nomeFantasia}`}
        action={<StatusChip status={pedido.prazoStatus} concluido={pedido.concluido} />}
      />

      <Paper
        elevation={0}
        sx={{
          mb: 2,
          px: 2,
          py: 1.5,
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.25,
          alignItems: 'center',
        }}
      >
        {etapasAtivas.map((etapa) => (
          <Chip
            key={etapa.id}
            label={resolveEtapaNomeExibicao(etapa, pedido)}
            color="primary"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        ))}
        <Typography variant="body2" color="text.secondary">
          {pedido.material.descricao}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {formatCurrency(pedido.valor)}
        </Typography>
      </Paper>

      <Box sx={{ mb: 3 }}>
        <ClinicaInteractiveTimeline pedido={pedido} etapas={etapas} somenteLeitura />
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }} elevation={0} variant="outlined">
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
              Dados do lançamento
            </Typography>
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography variant="body2">
                <strong>Clínica:</strong> {pedido.clinica.nome}
              </Typography>
              {pedido.paciente && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
                    Paciente
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nome:</strong> {pedido.paciente.nome}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Vínculo:</strong>{' '}
                    {pedido.paciente.vinculo === 'TITULAR' ? 'Titular' : 'Dependente'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>NIP:</strong> {formatNip(pedido.paciente.nip)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>NIP do titular:</strong> {formatNip(pedido.paciente.nipTitular)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nome do titular:</strong> {pedido.paciente.nomeTitular}
                  </Typography>
                </>
              )}
              {pedido.dadosClinica && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5 }}>
                    Procedimento
                  </Typography>
                  <Typography variant="body2">
                    <strong>Médico:</strong> {pedido.dadosClinica.medico}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Procedimento:</strong> {pedido.dadosClinica.procedimento}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Data da Cirurgia:</strong>{' '}
                    {formatDate(pedido.dadosClinica.dataCirurgia)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Material:</strong> {pedido.dadosClinica.materialUtilizado}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Valor Total:</strong>{' '}
                    {formatCurrency(pedido.dadosClinica.valorTotal)}
                  </Typography>
                </>
              )}
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Solicitação:</strong> {formatDate(pedido.dataSolicitacao)}
              </Typography>
              <Typography variant="body2">
                <strong>Valor:</strong> {formatCurrency(pedido.valor)}
              </Typography>
            </Box>
          </Paper>

          {pedido.solemp && (
            <Paper sx={{ p: 2.5, mt: 2, borderRadius: 3 }} elevation={0} variant="outlined">
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                SOLEMP
              </Typography>
              <Typography variant="body2">
                <strong>Número:</strong> {pedido.solemp.numero}
              </Typography>
              <Typography variant="body2">
                <strong>Data:</strong> {formatDate(pedido.solemp.data)}
              </Typography>
            </Paper>
          )}

          {pedido.notaFiscal && (
            <Paper sx={{ p: 2.5, mt: 2, borderRadius: 3 }} elevation={0} variant="outlined">
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                Nota Fiscal
              </Typography>
              <Typography variant="body2">
                <strong>Número:</strong> {pedido.notaFiscal.numero}
              </Typography>
              <Typography variant="body2">
                <strong>Data:</strong> {formatDate(pedido.notaFiscal.dataEmissao)}
              </Typography>
            </Paper>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }} elevation={0} variant="outlined">
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              Histórico
            </Typography>
            <List dense>
              {historico.map((h, i) => (
                <Box key={h.id}>
                  <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                    <ListItemText
                      primary={h.etapaNome}
                      secondary={
                        <>
                          {h.usuarioNome} · {formatDateTime(h.data)}
                          <br />
                          {h.observacao}
                        </>
                      }
                    />
                  </ListItem>
                  {i < historico.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </>
  )
}
