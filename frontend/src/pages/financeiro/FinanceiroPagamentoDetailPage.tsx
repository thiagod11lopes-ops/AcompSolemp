import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { Box, Button, Grid, Paper, Typography, Chip, Alert } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArchiveIcon from '@mui/icons-material/Archive'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { FinanceiroInteractiveTimeline } from '@/components/workflow/FinanceiroInteractiveTimeline'
import { FinanceiroPagamentoModal } from '@/components/financeiro/FinanceiroPagamentoModal'
import {
  useFinanceiroPedido,
  useRegistrarPagamento,
} from '@/hooks/useFinanceiroPedidos'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { formatCurrency, formatDate } from '@/utils/format'
import { financeiroPagamentoConcluido } from '@/utils/portal'
import { MENSAGENS_ARQUIVAMENTO } from '@/utils/processoArquivamento'

export default function FinanceiroPagamentoDetailPage() {
  const { id = '' } = useParams()
  const { navigatePortal } = usePortalPaths()
  const { data: pedido, isLoading } = useFinanceiroPedido(id)
  const { data: etapas = [] } = useWorkflowEtapas()
  const registrar = useRegistrarPagamento()
  const [modalOpen, setModalOpen] = useState(false)
  const [erro, setErro] = useState('')
  const [fluxoEncerrado, setFluxoEncerrado] = useState(false)

  const pagamentoConcluido = useMemo(() => {
    if (!pedido) return fluxoEncerrado
    return fluxoEncerrado || financeiroPagamentoConcluido(pedido, etapas)
  }, [pedido, etapas, fluxoEncerrado])

  if (isLoading) return <LoadingSpinner />

  if (!pedido) {
    return (
      <Box>
        <Typography>Processo não encontrado ou pagamento já realizado.</Typography>
        <Button onClick={() => navigatePortal('/financeiro/pagamentos')} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    )
  }

  const abrirModal = () => {
    if (pagamentoConcluido) return
    setErro('')
    if (!pedido.solemp?.id) {
      setErro('SOLEMP não encontrada para este processo')
      return
    }
    setModalOpen(true)
  }

  const handleRegistrar = ({
    notaFiscalNumero,
    empresaNome,
  }: {
    notaFiscalNumero: string
    empresaNome: string
  }) => {
    if (!pedido.solemp?.id) {
      setErro('SOLEMP não encontrada para este processo')
      return
    }

    registrar.mutate(
      {
        pedidoId: pedido.id,
        solempId: pedido.solemp.id,
        notaFiscalNumero,
        empresaNome,
      },
      {
        onSuccess: () => {
          setModalOpen(false)
          setFluxoEncerrado(true)
        },
        onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao registrar pagamento'),
      },
    )
  }

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() =>
          navigatePortal(pagamentoConcluido ? '/financeiro/arquivados' : '/financeiro/pagamentos')
        }
        sx={{ mb: 2 }}
      >
        {pagamentoConcluido ? 'Voltar aos arquivados' : 'Voltar aos pagamentos'}
      </Button>

      <PageHeader
        title={
          pagamentoConcluido
            ? `Pagamento concluído — ${pedido.numero}`
            : `Pagamento pendente — ${pedido.numero}`
        }
        subtitle={`${pedido.clinica.nome} · ${pedido.empresa.nomeFantasia}`}
      />

      {erro && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErro('')}>
          {erro}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <FinanceiroInteractiveTimeline
            pedido={pedido}
            etapas={etapas}
            onPagamento={pagamentoConcluido ? undefined : abrirModal}
            registrando={registrar.isPending && !modalOpen}
            mensagemFluxoEncerrado={
              pagamentoConcluido
                ? MENSAGENS_ARQUIVAMENTO.DIV_MAT_FINANCAS
                : null
            }
          />
          {pagamentoConcluido && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ArchiveIcon />}
              sx={{ mt: 2 }}
              onClick={() => navigatePortal('/financeiro/arquivados')}
            >
              Ver arquivados
            </Button>
          )}
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
                  pagamentoConcluido
                    ? 'Solemp confeccionada — concluído'
                    : 'Solemp confeccionada — pendente'
                }
                color={pagamentoConcluido ? 'success' : 'info'}
                size="small"
                sx={{ width: 'fit-content', mt: 1 }}
              />
            </Box>
          </Paper>

          {pedido.solemp && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                SOLEMP
              </Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 800 }}>
                {pedido.solemp.numero}
              </Typography>
              {pedido.solemp.valor != null && (
                <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                  {formatCurrency(pedido.solemp.valor)}
                </Typography>
              )}
              {pedido.notaFiscal && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Nota fiscal:</strong> {pedido.notaFiscal.numero}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {pagamentoConcluido
                  ? 'Pagamento registrado e processo arquivado pelo Financeiro.'
                  : 'Clique em Registrar pagamento para informar a nota fiscal e a empresa e finalizar a timeline.'}
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      <FinanceiroPagamentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onRegistrar={handleRegistrar}
        loading={registrar.isPending}
        pedidoNumero={pedido.numero}
        solempNumero={pedido.solemp?.numero ?? 'Não informada'}
        empresaSugerida={pedido.empresa.nomeFantasia}
      />
    </>
  )
}
