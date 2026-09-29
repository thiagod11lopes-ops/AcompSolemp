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
            width: { xs: '100%', md: 268 },
            minWidth: { md: 248 },
            maxWidth: { md: 280 },
            flexShrink: 0,
            borderLeft: { xs: 0, md: 1 },
            borderTop: { xs: 1, md: 0 },
            borderColor: 'divider',
            bgcolor: 'rgba(85, 139, 113, 0.04)',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
            alignSelf: { xs: 'stretch', md: 'flex-start' },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: 'text.secondary',
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  fontSize: '0.65rem',
                  lineHeight: 1.2,
                }}
              >
                Resumo
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                Dados do Processo
              </Typography>
            </Box>
            <Chip
              label={statusLabel}
              color={statusColor}
              size="small"
              sx={{ fontWeight: 700, maxWidth: 132, '& .MuiChip-label': { px: 0.75 } }}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 0.7,
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
            }}
          >
            {(
              [
                ['Clínica', pedido.clinica.nome],
                ['Material', pedido.material.descricao],
                ['Solicitação', formatDate(pedido.dataSolicitacao)],
              ] as const
            ).map(([label, value]) => (
              <Box
                key={label}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '78px 1fr',
                  columnGap: 0.75,
                  alignItems: 'baseline',
                  minWidth: 0,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={value}
                >
                  {value}
                </Typography>
              </Box>
            ))}
            <Divider sx={{ my: 0.15 }} />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Valor
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                {formatCurrency(pedido.valor)}
              </Typography>
            </Box>
          </Box>

          {pedido.solemp && (
            <Box
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: 'rgba(85, 139, 113, 0.1)',
                border: 1,
                borderColor: 'rgba(85, 139, 113, 0.22)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: 'primary.dark',
                  fontSize: '0.65rem',
                  mb: 0.35,
                }}
              >
                SOLEMP
              </Typography>
              <Typography
                variant="subtitle2"
                color="primary"
                sx={{ fontWeight: 800, lineHeight: 1.25, wordBreak: 'break-word' }}
              >
                {pedido.solemp.numero}
              </Typography>
              <Box
                sx={{
                  mt: 0.65,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                {pedido.solemp.valor != null && (
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {formatCurrency(pedido.solemp.valor)}
                  </Typography>
                )}
                {pedido.notaFiscal && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    NF {pedido.notaFiscal.numero}
                  </Typography>
                )}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.75, lineHeight: 1.35 }}
              >
                {pagamentoConcluido
                  ? 'Pagamento registrado e arquivado.'
                  : pedido.aguardandoEmpenho
                    ? 'Aguardando empenho — timeline permanece em Aguardando NE.'
                    : 'Aguardando Empenhar ou Registrar pagamento.'}
              </Typography>
            </Box>
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
