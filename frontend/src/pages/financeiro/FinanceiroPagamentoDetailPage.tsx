import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  Chip,
  MenuItem,
  TextField,
  Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PaymentsIcon from '@mui/icons-material/Payments'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { FinanceiroInteractiveTimeline } from '@/components/workflow/FinanceiroInteractiveTimeline'
import {
  useFinanceiroPedido,
  useFinanceiroPedidos,
  useRegistrarPagamento,
} from '@/hooks/useFinanceiroPedidos'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { formatCurrency, formatDate } from '@/utils/format'

export default function FinanceiroPagamentoDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: pedido, isLoading } = useFinanceiroPedido(id)
  const { data: todosPendentes = [] } = useFinanceiroPedidos()
  const { data: etapas = [] } = useWorkflowEtapas()
  const registrar = useRegistrarPagamento()
  const [solempId, setSolempId] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (pedido?.solemp?.id) setSolempId(pedido.solemp.id)
  }, [pedido?.solemp?.id])

  const solempOptions = todosPendentes
    .filter((p) => p.solemp)
    .map((p) => ({
      id: p.solemp!.id,
      numero: p.solemp!.numero,
      pedidoId: p.id,
      pedidoNumero: p.numero,
    }))

  if (isLoading) return <LoadingSpinner />

  if (!pedido) {
    return (
      <Box>
        <Typography>Processo não encontrado ou pagamento já realizado.</Typography>
        <Button onClick={() => navigate('/financeiro/pagamentos')} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    )
  }

  const handlePagamento = () => {
    setErro('')
    if (!solempId) {
      setErro('Selecione a SOLEMP para confirmar o pagamento')
      return
    }
    if (pedido.solemp && solempId !== pedido.solemp.id) {
      setErro('A SOLEMP selecionada não corresponde a este processo')
      return
    }

    registrar.mutate(
      { pedidoId: pedido.id, solempId },
      {
        onSuccess: () => navigate('/financeiro/pagamentos'),
        onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao registrar pagamento'),
      },
    )
  }

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/financeiro/pagamentos')}
        sx={{ mb: 2 }}
      >
        Voltar aos pagamentos
      </Button>

      <PageHeader
        title={`Pagamento pendente — ${pedido.numero}`}
        subtitle={`${pedido.clinica.nome} · ${pedido.empresa.nomeFantasia}`}
      />

      {erro && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <FinanceiroInteractiveTimeline
            pedido={pedido}
            etapas={etapas}
            onPagamento={handlePagamento}
            registrando={registrar.isPending}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Dados do Processo
            </Typography>
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography variant="body2">
                <strong>Clínica:</strong> {pedido.clinica.nome}
              </Typography>
              <Typography variant="body2">
                <strong>Material:</strong> {pedido.material.descricao}
              </Typography>
              <Typography variant="body2">
                <strong>Valor:</strong> {formatCurrency(pedido.valor)}
              </Typography>
              <Typography variant="body2">
                <strong>Solicitação:</strong> {formatDate(pedido.dataSolicitacao)}
              </Typography>
              <Chip
                label={
                  pedido.etapaAtual.chave === 'PAGAMENTO_REALIZADO'
                    ? 'Aguardando encerramento'
                    : 'Pagamento pendente'
                }
                color={pedido.etapaAtual.chave === 'PAGAMENTO_REALIZADO' ? 'success' : 'info'}
                size="small"
                sx={{ width: 'fit-content', mt: 1 }}
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Confirmar pagamento
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Selecione a SOLEMP no sistema e clique em pagamento realizado para encerrar o
              processo.
            </Typography>

            <TextField
              select
              fullWidth
              label="SOLEMP"
              value={solempId || pedido.solemp?.id || ''}
              onChange={(e) => setSolempId(e.target.value)}
              sx={{ mb: 2 }}
            >
              {solempOptions.map((opt) => (
                <MenuItem key={opt.id} value={opt.id}>
                  {opt.numero} — Pedido {opt.pedidoNumero}
                </MenuItem>
              ))}
            </TextField>

            {pedido.solemp && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                SOLEMP deste processo: <strong>{pedido.solemp.numero}</strong>
              </Typography>
            )}

            <Button
              fullWidth
              variant="contained"
              color="success"
              size="large"
              startIcon={<PaymentsIcon />}
              onClick={handlePagamento}
              disabled={registrar.isPending}
            >
              {registrar.isPending ? 'Registrando...' : (
                pedido.etapaAtual.chave === 'PAGAMENTO_REALIZADO'
                  ? 'Finalizar processo'
                  : 'Pagamento realizado'
              )}
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              {pedido.etapaAtual.chave === 'PAGAMENTO_REALIZADO' ? (
                <>
                  O estágio <strong>Processo encerrado</strong> será concluído automaticamente.
                </>
              ) : (
                <>
                  Os estágios <strong>Pagamento realizado</strong> e <strong>Processo encerrado</strong>{' '}
                  serão concluídos automaticamente.
                </>
              )}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </>
  )
}
