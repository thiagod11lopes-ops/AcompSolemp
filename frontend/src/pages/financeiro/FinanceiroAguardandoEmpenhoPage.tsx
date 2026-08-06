import { useMemo } from 'react'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Paper,
  Typography,
} from '@mui/material'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useFinanceiroAguardandoEmpenho } from '@/hooks/useFinanceiroPedidos'
import { formatCurrency, formatDate } from '@/utils/format'
import { premiumTokens } from '@/theme/tokens'

function valorSolemp(pedido: { solemp?: { valor?: number } | null; valor: number }) {
  if (typeof pedido.solemp?.valor === 'number' && Number.isFinite(pedido.solemp.valor)) {
    return pedido.solemp.valor
  }
  return pedido.valor
}

export default function FinanceiroAguardandoEmpenhoPage() {
  const { navigatePortal } = usePortalPaths()
  const { data: pedidos = [], isLoading } = useFinanceiroAguardandoEmpenho()

  const resumo = useMemo(() => {
    const quantidade = pedidos.length
    const valorTotal = pedidos.reduce((acc, p) => acc + valorSolemp(p), 0)
    return { quantidade, valorTotal }
  }, [pedidos])

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <PageHeader
        title="Aguardando Empenho"
        subtitle="Solemps marcadas com a tarja Aguardando — ainda sem avançar para Empenhado"
      />

      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 3,
          border: `1px solid ${premiumTokens.orange}44`,
          background: `linear-gradient(135deg, ${premiumTokens.orange}14 0%, transparent 70%)`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${premiumTokens.orange}22`,
              color: premiumTokens.orange,
            }}
          >
            <HourglassTopIcon />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Solemps Aguardando Empenho
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {resumo.quantidade}
            </Typography>
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Valor total
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, lineHeight: 1.2, color: premiumTokens.orange }}
          >
            {formatCurrency(resumo.valorTotal)}
          </Typography>
        </Box>
      </Paper>

      {pedidos.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <HourglassTopIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">
            Nenhuma Solemp marcada como Aguardando Empenho no momento.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {pedidos.map((pedido) => (
            <Grid key={pedido.id} size={{ xs: 12, md: 6 }}>
              <Card
                variant="outlined"
                sx={{
                  borderLeft: 4,
                  borderColor: premiumTokens.orange,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 28,
                    bgcolor: '#c2410c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      color: '#fff',
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                    }}
                  >
                    Aguardando
                  </Typography>
                </Box>
                <CardActionArea
                  onClick={() => navigatePortal(`/financeiro/pagamentos/${pedido.id}`)}
                  sx={{ pr: 4 }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {pedido.numero}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Chip label="Aguardando" size="small" color="warning" />
                        {pedido.solemp && (
                          <Chip label={pedido.solemp.numero} color="primary" size="small" />
                        )}
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {pedido.clinica.nome} · {pedido.material.descricao}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={formatCurrency(valorSolemp(pedido))}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: premiumTokens.orange, color: premiumTokens.orange }}
                      />
                      <Chip
                        label={`Solicitação: ${formatDate(pedido.dataSolicitacao)}`}
                        size="small"
                        variant="outlined"
                      />
                      {pedido.aguardandoEmpenhoEm && (
                        <Chip
                          label={`Marcado: ${formatDate(pedido.aguardandoEmpenhoEm)}`}
                          size="small"
                          variant="outlined"
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
