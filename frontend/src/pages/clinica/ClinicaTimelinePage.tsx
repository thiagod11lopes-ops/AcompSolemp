import { useMemo, useState } from 'react'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Typography,
} from '@mui/material'
import TimelineIcon from '@mui/icons-material/Timeline'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusChip } from '@/components/common/StatusChip'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { TimelineListToolbar } from '@/components/common/TimelineListToolbar'
import { useClinicaPedidos } from '@/hooks/useClinicaPedidos'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { formatDate, formatNip } from '@/utils/format'
import {
  contarTimelineList,
  filtrarTimelineList,
  type TimelineListExtraFilters,
  type TimelineListFiltro,
} from '@/utils/timelineListFilter'
import type { PedidoComDetalhes } from '@/types'

export default function ClinicaTimelinePage() {
  const { navigatePortal } = usePortalPaths()
  const { user } = useClinicaAuth()
  const { data: pedidos = [], isLoading } = useClinicaPedidos()
  const [filtro, setFiltro] = useState<TimelineListFiltro>('EM_ANDAMENTO')
  const [extras, setExtras] = useState<TimelineListExtraFilters>({})
  const isMedicamento = user?.perfil === 'MEDICAMENTO'

  /** Clínica: “minhas pendências” = processos que precisam de atenção (atraso ou perto do prazo). */
  const isPendenteClinica = useMemo(
    () => (pedido: PedidoComDetalhes) =>
      !pedido.concluido &&
      (pedido.prazoStatus === 'ATRASADO' || pedido.prazoStatus === 'PROXIMO_VENCIMENTO'),
    [],
  )

  const filterOpts = useMemo(
    () => ({ pendente: isPendenteClinica }),
    [isPendenteClinica],
  )

  const contagens = useMemo(
    () => contarTimelineList(pedidos, filterOpts, extras),
    [pedidos, filterOpts, extras],
  )
  const filtrados = useMemo(
    () => filtrarTimelineList(pedidos, filtro, filterOpts, extras),
    [pedidos, filtro, filterOpts, extras],
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Timelines"
        subtitle={
          isMedicamento
            ? 'Fila do medicamento: atenção, atrasos e filtro por data'
            : 'Fila da clínica: atenção, atrasos e filtro por data'
        }
      />

      <TimelineListToolbar
        filtro={filtro}
        onFiltroChange={setFiltro}
        contagens={contagens}
        extras={extras}
        onExtrasChange={setExtras}
        showClinicaFilter={false}
      />

      {filtrados.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <TimelineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            {pedidos.length === 0
              ? 'Nenhuma timeline criada ainda. Vá em Novo Pedido e clique em Solicitar Material.'
              : 'Nenhuma timeline encontrada com o filtro atual.'}
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtrados.map((pedido) => (
            <Grid key={pedido.id} size={{ xs: 12, md: 6 }}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderLeft: 4,
                  borderColor:
                    pedido.prazoStatus === 'ATRASADO'
                      ? 'error.main'
                      : pedido.prazoStatus === 'PROXIMO_VENCIMENTO'
                        ? 'warning.main'
                        : 'divider',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 4 },
                }}
              >
                <CardActionArea
                  onClick={() => navigatePortal(`/clinica/timeline/${pedido.id}`)}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {pedido.numero}
                      </Typography>
                      <StatusChip status={pedido.prazoStatus} concluido={pedido.concluido} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {pedido.paciente
                        ? `${pedido.paciente.nome} · NIP ${formatNip(pedido.paciente.nip)}`
                        : `${pedido.material.descricao} · ${pedido.empresa.nomeFantasia}`}
                      {pedido.dadosClinica ? ` · ${pedido.dadosClinica.procedimento}` : ''}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Etapa:</strong> {pedido.etapaAtual.nome}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      <Chip
                        label={`Início: ${formatDate(pedido.dataSolicitacao)}`}
                        size="small"
                        variant="outlined"
                      />
                      {!pedido.concluido && pedido.diasRestantes < 0 && (
                        <Chip
                          label={`Atrasado ${Math.abs(pedido.diasRestantes)}d`}
                          size="small"
                          color="error"
                        />
                      )}
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  )
}
