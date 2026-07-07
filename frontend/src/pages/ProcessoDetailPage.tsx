import { useParams } from 'react-router-dom'
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
import { ProcessTimeline } from '@/components/workflow/ProcessTimeline'
import { usePedido } from '@/hooks/usePedidos'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useWorkflowEtapas, useHistorico } from '@/hooks/useCadastros'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format'

export default function ProcessoDetailPage() {
  const { id = '' } = useParams()
  const { navigatePortal } = usePortalPaths()
  const { data: pedido, isLoading } = usePedido(id)
  const { data: etapas = [] } = useWorkflowEtapas()
  const { data: historico = [] } = useHistorico(id)

  if (isLoading) return <LoadingSpinner />
  if (!pedido) {
    return <Typography>Processo não encontrado</Typography>
  }

  return (
    <>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigatePortal('/gestor/processos')} sx={{ mb: 2 }}>
        Voltar
      </Button>
      <PageHeader
        title={`Processo ${pedido.numero}`}
        subtitle={`${pedido.clinica.nome} · ${pedido.empresa.nomeFantasia}`}
        action={<StatusChip status={pedido.prazoStatus} concluido={pedido.concluido} />}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Dados do Pedido
            </Typography>
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography variant="body2">
                <strong>Material:</strong> {pedido.material.descricao}
              </Typography>
              <Typography variant="body2">
                <strong>Quantidade:</strong> {pedido.quantidade} {pedido.material.unidade}
              </Typography>
              <Typography variant="body2">
                <strong>Valor:</strong> {formatCurrency(pedido.valor)}
              </Typography>
              <Typography variant="body2">
                <strong>Solicitação:</strong> {formatDate(pedido.dataSolicitacao)}
              </Typography>
              {pedido.dataEntrega && (
                <Typography variant="body2">
                  <strong>Entrega:</strong> {formatDate(pedido.dataEntrega)}
                </Typography>
              )}
              <Typography variant="body2">
                <strong>Etapa:</strong> {pedido.etapaAtual.nome}
              </Typography>
              <Typography variant="body2">
                <strong>Responsável:</strong> {pedido.responsavelAtual?.nome ?? '—'}
              </Typography>
              <Chip
                label={
                  pedido.diasRestantes >= 0
                    ? `${pedido.diasRestantes} dias restantes`
                    : `${Math.abs(pedido.diasRestantes)} dias de atraso`
                }
                color={
                  pedido.prazoStatus === 'NO_PRAZO'
                    ? 'success'
                    : pedido.prazoStatus === 'PROXIMO_VENCIMENTO'
                      ? 'warning'
                      : 'error'
                }
                size="small"
                sx={{ width: 'fit-content', mt: 1 }}
              />
            </Box>
          </Paper>

          {pedido.solemp && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                SOLEMP
              </Typography>
              <Typography variant="body2">Nº {pedido.solemp.numero}</Typography>
              <Typography variant="body2">Data: {formatDate(pedido.solemp.data)}</Typography>
              <Chip
                label={pedido.solemp.assinada ? 'Assinada' : 'Pendente'}
                color={pedido.solemp.assinada ? 'success' : 'warning'}
                size="small"
                sx={{ mt: 1 }}
              />
            </Paper>
          )}

          {pedido.notaFiscal && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Nota Fiscal
              </Typography>
              <Typography variant="body2">Nº {pedido.notaFiscal.numero}</Typography>
              <Typography variant="body2">
                Valor: {formatCurrency(pedido.notaFiscal.valor)}
              </Typography>
            </Paper>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <ProcessTimeline pedido={pedido} etapas={etapas} />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Histórico
            </Typography>
            <List dense>
              {historico.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum evento registrado
                </Typography>
              ) : (
                historico.map((h, i) => (
                  <Box key={h.id}>
                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemText
                        primary={`${h.usuarioNome} — ${h.etapaNome}`}
                        secondary={
                          <>
                            {formatDateTime(h.data)}
                            <br />
                            {h.observacao}
                          </>
                        }
                      />
                    </ListItem>
                    {i < historico.length - 1 && <Divider />}
                  </Box>
                ))
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </>
  )
}
