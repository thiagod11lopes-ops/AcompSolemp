import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import { SolempModal } from '@/components/clinica/SolempModal'
import { NotaFiscalModal } from '@/components/clinica/NotaFiscalModal'
import { RevertTimelineModal } from '@/components/clinica/RevertTimelineModal'
import {
  useClinicaPedido,
  useClinicaPedidoAcao,
  useClinicaReverterEtapa,
  useSolempDefaults,
} from '@/hooks/useClinicaPedidos'
import { useWorkflowEtapas, useHistorico } from '@/hooks/useCadastros'
import { clinicaPedidoService } from '@/services/clinicaPedidoService'
import { formatCurrency, formatDate, formatDateTime, formatNip } from '@/utils/format'

export default function ClinicaTimelineDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: pedido, isLoading } = useClinicaPedido(id)
  const { data: etapas = [] } = useWorkflowEtapas()
  const { data: historico = [] } = useHistorico(id)
  const { data: solempDefaults } = useSolempDefaults()
  const executarAcao = useClinicaPedidoAcao()
  const reverterEtapa = useClinicaReverterEtapa()

  const [solempModalOpen, setSolempModalOpen] = useState(false)
  const [nfModalOpen, setNfModalOpen] = useState(false)
  const [revertModalOpen, setRevertModalOpen] = useState(false)

  if (isLoading || !solempDefaults) return <LoadingSpinner />
  if (!pedido) {
    return (
      <Box>
        <Typography>Timeline não encontrada.</Typography>
        <Button onClick={() => navigate('/clinica/timeline')} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    )
  }

  const acao = clinicaPedidoService.getAcaoDisponivel(pedido.etapaAtual.chave)
  const podeReverter = clinicaPedidoService.podeReverter(pedido, etapas)
  const etapaAnteriorNome = clinicaPedidoService.getEtapaAnteriorNome(pedido, etapas)

  const handleAvancar = () => {
    if (pedido.etapaAtual.chave === 'SOLEMP_CRIADA') {
      setSolempModalOpen(true)
      return
    }
    if (
      pedido.etapaAtual.chave === 'SOLEMP_ASSINADA' ||
      pedido.etapaAtual.chave === 'NF_ANEXADA'
    ) {
      setNfModalOpen(true)
      return
    }
    executarAcao.mutate({ pedidoId: pedido.id })
  }

  const handleConfirmSolemp = (numero: string) => {
    executarAcao.mutate(
      { pedidoId: pedido.id, solempNumero: numero },
      { onSuccess: () => setSolempModalOpen(false) },
    )
  }

  const handleConfirmNotaFiscal = (numero: string) => {
    executarAcao.mutate(
      { pedidoId: pedido.id, notaFiscalNumero: numero },
      { onSuccess: () => setNfModalOpen(false) },
    )
  }

  const handleConfirmRevert = (motivo: string) => {
    reverterEtapa.mutate(
      { pedidoId: pedido.id, motivo },
      { onSuccess: () => setRevertModalOpen(false) },
    )
  }

  return (
    <>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/clinica/timeline')}
        sx={{ mb: 2 }}
      >
        Voltar às timelines
      </Button>

      <PageHeader
        title={`Timeline — ${pedido.numero}`}
        subtitle={
          pedido.paciente
            ? `${pedido.paciente.nome} · NIP ${formatNip(pedido.paciente.nip)}`
            : `${pedido.empresa.nomeFantasia} · ${pedido.material.descricao}`
        }
        action={<StatusChip status={pedido.prazoStatus} concluido={pedido.concluido} />}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <ClinicaInteractiveTimeline
            pedido={pedido}
            etapas={etapas}
            onAvancar={acao ? handleAvancar : undefined}
            onReverter={() => setRevertModalOpen(true)}
            podeReverter={podeReverter}
            avancando={executarAcao.isPending}
            revertendo={reverterEtapa.isPending}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Dados do Lançamento
            </Typography>
            <Box sx={{ display: 'grid', gap: 1 }}>
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
                  <Typography variant="body2">
                    <strong>Tipo de usuário:</strong>{' '}
                    {{
                      MILITAR: 'Militar',
                      MILITAR_DA_RESERVA: 'Militar da Reserva',
                      MILITAR_RESERVADO: 'Militar Reformado',
                      DEPENDENTE_DIRETO: 'Dependente Direto',
                      DEPENDENTE_INDIRETO: 'Dependente Indireto',
                      PENSIONISTA: 'Pensionista',
                    }[pedido.paciente.tipoUsuario]}
                  </Typography>
                </>
              )}
              {pedido.dadosClinica && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5 }}>
                    Clínica
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nome da Clínica:</strong> {pedido.dadosClinica.nomeClinica}
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
                    <strong>Empresa consignada:</strong>{' '}
                    {pedido.dadosClinica.empresaConsignada}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Pregão:</strong> {pedido.dadosClinica.pregao}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Material Utilizado:</strong>{' '}
                    {pedido.dadosClinica.materialUtilizado}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Quantidade:</strong> {pedido.dadosClinica.quantidade}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Valor Unitário:</strong>{' '}
                    {formatCurrency(pedido.dadosClinica.valorUnitario)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Valor Total:</strong>{' '}
                    {formatCurrency(pedido.dadosClinica.valorTotal)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Folha da Sala:</strong>{' '}
                    {pedido.dadosClinica.folhaSala || '—'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Descrição da Cirurgia:</strong>{' '}
                    {pedido.dadosClinica.descricaoCirurgica || '—'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Etiquetas:</strong>{' '}
                    {pedido.dadosClinica.etiquetas || '—'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Fotos:</strong>{' '}
                    {(pedido.dadosClinica.fotos ?? []).length > 0
                      ? pedido.dadosClinica.fotos.join(', ')
                      : '—'}
                  </Typography>
                </>
              )}
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Solicitação:</strong> {formatDate(pedido.dataSolicitacao)}
              </Typography>
              <Chip
                label={pedido.etapaAtual.nome}
                color="primary"
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
              <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
                {pedido.solemp.numero}
              </Typography>
            </Paper>
          )}

          {pedido.notaFiscal && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Nota Fiscal
              </Typography>
              <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
                NF {pedido.notaFiscal.numero}
              </Typography>
            </Paper>
          )}

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
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

      <SolempModal
        open={solempModalOpen}
        onClose={() => setSolempModalOpen(false)}
        onConfirm={handleConfirmSolemp}
        loading={executarAcao.isPending}
        defaults={solempDefaults}
      />

      <NotaFiscalModal
        open={nfModalOpen}
        onClose={() => setNfModalOpen(false)}
        onConfirm={handleConfirmNotaFiscal}
        loading={executarAcao.isPending}
      />

      <RevertTimelineModal
        open={revertModalOpen}
        onClose={() => setRevertModalOpen(false)}
        onConfirm={handleConfirmRevert}
        loading={reverterEtapa.isPending}
        etapaDe={pedido.etapaAtual.nome}
        etapaPara={etapaAnteriorNome}
      />
    </>
  )
}
