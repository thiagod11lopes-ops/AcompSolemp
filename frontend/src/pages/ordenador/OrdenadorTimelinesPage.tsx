import { useNavigate } from 'react-router-dom'
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
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useOrdenadorPedidos } from '@/hooks/useOrdenadorPedidos'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/utils/format'
import { getRoleLabel } from '@/mocks/seed'
import { PERFIL_PARA_CHAVE_ETAPA } from '@/utils/perfilEtapa'

export default function OrdenadorTimelinesPage() {
  const navigate = useNavigate()
  const { user } = useOrdenadorAuth()
  const { data: pedidos = [], isLoading } = useOrdenadorPedidos()
  const perfilLabel = user ? getRoleLabel(user.perfil) : 'Setor'
  const etapaChave = user ? PERFIL_PARA_CHAVE_ETAPA[user.perfil] : null

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title={`Pendências — ${perfilLabel}`}
        subtitle="Processos com etapa ativa para o seu perfil"
      />

      {pedidos.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <TimelineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            Nenhum processo pendente para {perfilLabel} no momento.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {pedidos.map((pedido) => {
            const etapaAtiva = pedido.etapasHistorico.find(
              (h) =>
                (pedido.etapasAtivasIds ?? [pedido.etapaAtualId]).includes(h.etapaId) &&
                !h.dataConclusao,
            )
            return (
              <Grid key={pedido.id} size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
                  <CardActionArea onClick={() => navigate(`/ordenador/timelines/${pedido.id}`)}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {pedido.numero}
                        </Typography>
                        {pedido.solemp && (
                          <Chip label={pedido.solemp.numero} color="primary" size="small" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {pedido.clinica.nome} · {pedido.material.descricao}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Etapa:</strong>{' '}
                        {etapaAtiva?.etapaNome ?? pedido.etapaAtual.nome}
                        {etapaChave ? ` (${perfilLabel})` : ''}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={formatCurrency(pedido.valor)} size="small" variant="outlined" />
                        <Chip
                          label={`Solicitação: ${formatDate(pedido.dataSolicitacao)}`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}
    </>
  )
}
