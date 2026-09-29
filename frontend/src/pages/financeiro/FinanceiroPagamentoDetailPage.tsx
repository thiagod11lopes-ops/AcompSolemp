import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { Box, Button, Typography, Chip, Alert, Divider } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArchiveIcon from '@mui/icons-material/Archive'
import DescriptionIcon from '@mui/icons-material/Description'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { FinanceiroInteractiveTimeline } from '@/components/workflow/FinanceiroInteractiveTimeline'
import { FinanceiroPagamentoModal } from '@/components/financeiro/FinanceiroPagamentoModal'
import { AuditoriaPlanilhaModal } from '@/components/ordenador/AuditoriaPlanilhaModal'
import {
  useFinanceiroPedido,
  useMarcarAguardandoEmpenho,
  useRegistrarPagamento,
} from '@/hooks/useFinanceiroPedidos'
import { useWorkflowEtapas } from '@/hooks/useCadastros'
import { pedidoPlanilhaEnvioService } from '@/services/pedidoPlanilhaEnvioService'
import { formatCurrency, formatDate } from '@/utils/format'
import { financeiroPagamentoConcluido } from '@/utils/portal'
import { MENSAGENS_ARQUIVAMENTO } from '@/utils/processoArquivamento'

export default function FinanceiroPagamentoDetailPage() {
  const { id = '' } = useParams()
  const { navigatePortal } = usePortalPaths()
  const { data: pedido, isLoading } = useFinanceiroPedido(id)
  const { data: etapas = [] } = useWorkflowEtapas()
  const registrar = useRegistrarPagamento()
  const marcarAguardando = useMarcarAguardandoEmpenho()
  const [modalOpen, setModalOpen] = useState(false)
  const [planilhaOpen, setPlanilhaOpen] = useState(false)
  const [erro, setErro] = useState('')
  const [fluxoEncerrado, setFluxoEncerrado] = useState(false)

  const pagamentoConcluido = useMemo(() => {
    if (!pedido) return fluxoEncerrado
    return fluxoEncerrado || financeiroPagamentoConcluido(pedido, etapas)
  }, [pedido, etapas, fluxoEncerrado])

  const planilhaEnvio = useMemo(
    () => (pedido ? pedidoPlanilhaEnvioService.getForPedido(pedido.id) : null),
    [pedido],
  )

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

  const handleAguardandoEmpenhar = () => {
    if (pagamentoConcluido) return
    setErro('')
    marcarAguardando.mutate(pedido.id, {
      onError: (e) =>
        setErro(e instanceof Error ? e.message : 'Erro ao marcar Aguardando Empenhar'),
    })
  }

  const handleRegistrar = ({
    notaFiscalNumero,
    empresaNome,
    empenhoNumero,
    observacoes,
  }: {
    notaFiscalNumero: string
    empresaNome: string
    empenhoNumero: string
    observacoes: string
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
        empenhoNumero,
        observacoes,
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

  const statusLabel = pagamentoConcluido
    ? 'Aguardando NE — concluído'
    : pedido.aguardandoEmpenho
      ? 'Aguardando Empenhar'
      : 'Aguardando NE — pendente'

  const statusColor = pagamentoConcluido
    ? 'success'
    : pedido.aguardandoEmpenho
      ? 'warning'
      : 'info'

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

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'stretch',
          gap: 0,
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            // Contém a timeline horizontal para não invadir o painel da direita
            '& .timeline-root': {
              border: 0,
              borderRadius: 0,
              boxShadow: 'none',
              height: '100%',
            },
          }}
        >
          <FinanceiroInteractiveTimeline
            pedido={pedido}
            etapas={etapas}
            onPagamento={pagamentoConcluido ? undefined : abrirModal}
            onAguardandoEmpenhar={pagamentoConcluido ? undefined : handleAguardandoEmpenhar}
            onVerPlanilha={planilhaEnvio ? () => setPlanilhaOpen(true) : undefined}
            registrando={registrar.isPending && !modalOpen}
            marcandoAguardando={marcarAguardando.isPending}
            mensagemFluxoEncerrado={
              pagamentoConcluido ? MENSAGENS_ARQUIVAMENTO.DIV_MAT_FINANCAS : null
            }
          />
          {(planilhaEnvio || pagamentoConcluido) && (
            <Box sx={{ px: 2.5, pb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {planilhaEnvio && (
                <Button
                  variant="outlined"
                  startIcon={<DescriptionIcon />}
                  onClick={() => setPlanilhaOpen(true)}
                >
                  Ver Div. de Material
                </Button>
              )}
              {pagamentoConcluido && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<ArchiveIcon />}
                  onClick={() => navigatePortal('/financeiro/arquivados')}
                >
                  Ver arquivados
                </Button>
              )}
            </Box>
          )}
        </Box>

        <Box
          component="aside"
          sx={{
            width: { xs: '100%', md: 280 },
            minWidth: { md: 260 },
            maxWidth: { md: 300 },
            flexShrink: 0,
            borderLeft: { xs: 0, md: 1 },
            borderTop: { xs: 1, md: 0 },
            borderColor: 'divider',
            bgcolor: 'rgba(85, 139, 113, 0.04)',
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            position: { md: 'sticky' },
            top: { md: 0 },
            alignSelf: 'stretch',
          }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.1 }}>
              Resumo
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.25 }}>
              Dados do Processo
            </Typography>
            <Box sx={{ display: 'grid', gap: 0.85 }}>
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
                label={statusLabel}
                color={statusColor}
                size="small"
                sx={{ width: 'fit-content', mt: 0.5, fontWeight: 700 }}
              />
            </Box>
          </Box>

          {pedido.solemp && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.75 }}>
                  SOLEMP
                </Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
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
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25, lineHeight: 1.45 }}>
                  {pagamentoConcluido
                    ? 'Pagamento registrado e processo arquivado pelo Financeiro.'
                    : pedido.aguardandoEmpenho
                      ? 'Marcado como Aguardando Empenhar. A timeline permanece em Aguardando NE até o registro do pagamento.'
                      : 'Use Aguardando Empenhar para a tarja laranja, ou Registrar pagamento para avançar.'}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Box>

      <FinanceiroPagamentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onRegistrar={handleRegistrar}
        loading={registrar.isPending}
        pedidoNumero={pedido.numero}
        solempNumero={pedido.solemp?.numero ?? 'Não informada'}
        empresaSugerida={pedido.empresa.nomeFantasia}
      />

      <AuditoriaPlanilhaModal
        open={planilhaOpen}
        pedidoNumero={pedido.numero}
        planilha={planilhaEnvio}
        preferFormato={
          planilhaEnvio?.divMaterialLinhas?.length ? 'divMaterial' : 'controleSolemp'
        }
        title={`Aguardando NE — Div. de Material ${pedido.numero}`}
        onClose={() => setPlanilhaOpen(false)}
      />
    </>
  )
}
