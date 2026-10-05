import { Navigate } from 'react-router-dom'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import PreviewIcon from '@mui/icons-material/Preview'
import { Alert, Box, Button, Tooltip, Typography } from '@mui/material'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { MedicamentoBalancoCharts } from '@/components/clinica/MedicamentoBalancoCharts'
import { MedicamentoDashboardCharts } from '@/components/clinica/MedicamentoDashboardCharts'
import { MedicamentoPeriodoToolbar } from '@/components/clinica/MedicamentoPeriodoToolbar'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useClinicas } from '@/hooks/useCadastros'
import { useMedicamentoPmeResumo } from '@/hooks/useMedicamentoPmeResumo'
import DashboardPage from '@/pages/DashboardPage'

/** Dashboard da clínica logada. Medicamento vê só a PME, com gráficos. */
export default function ClinicaDashboardPage() {
  const { user, isLoading: authLoading } = useClinicaAuth()
  const { mapPath, demoBannerHeight } = usePortalPaths()
  const { data: clinicas = [], isLoading: clinicasLoading } = useClinicas()
  const clinica = clinicas.find((c) => c.id === user?.clinicaId)
  const isMedicamento = user?.perfil === 'MEDICAMENTO' || clinica?.tipo === 'medicamento'
  const nomeClinica = clinica?.nome?.trim() || 'sua clínica'
  const resumo = useMedicamentoPmeResumo(user?.clinicaId ?? '', isMedicamento)

  if (authLoading || clinicasLoading) return <LoadingSpinner />
  if (!user?.clinicaId) {
    return <Navigate to={mapPath('/clinica/timelines')} replace />
  }

  if (!isMedicamento) {
    return (
      <DashboardPage
        clinicaId={user.clinicaId}
        metricsEnabled={Boolean(user.clinicaId)}
        title="Dashboard"
        subtitle={`Indicadores exclusivos de ${nomeClinica}`}
      />
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minHeight: 0,
        height: {
          sm: `calc(100dvh - ${demoBannerHeight + 64 + 32}px)`,
          md: `calc(100dvh - ${demoBannerHeight + 64 + 48}px)`,
        },
        overflow: { sm: 'hidden' },
      }}
    >
      <PageHeader
        title="Dashboard"
        subtitle={
          resumo.mostrarExemplo
            ? `Pré-visualização com dados de exemplo · ${resumo.balanco.periodoLabel}`
            : `PME de ${nomeClinica} · ${resumo.balanco.periodoLabel}`
        }
        dense
        titleAdornment={<AccountBalanceIcon color="primary" fontSize="small" />}
        action={
          <Tooltip
            title={
              resumo.mostrarExemplo
                ? 'Voltar aos dados reais'
                : 'Ver como fica o dashboard com dados de exemplo'
            }
          >
            <Button
              size="small"
              variant={resumo.mostrarExemplo ? 'contained' : 'outlined'}
              startIcon={<PreviewIcon />}
              onClick={() => resumo.setMostrarExemplo((v) => !v)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {resumo.mostrarExemplo ? 'Sair do exemplo' : 'Ver exemplo'}
            </Button>
          </Tooltip>
        }
      />

      {resumo.mostrarExemplo ? (
        <Alert severity="info" sx={{ py: 0 }}>
          Exibindo dados fictícios para demonstração. Isso não altera estoque, IMH nem pedidos.
        </Alert>
      ) : null}

      {resumo.planilhasError && !resumo.mostrarExemplo ? (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          Não foi possível carregar as planilhas. Os totais podem ficar zerados até recarregar.
        </Typography>
      ) : null}

      <MedicamentoPeriodoToolbar
        idPrefix="dashboard-pme"
        periodoTipo={resumo.periodoTipo}
        onPeriodoTipo={resumo.setPeriodoTipo}
        referencia={resumo.referencia}
        onReferencia={resumo.setReferencia}
        anos={resumo.anos}
        mostrarExemplo={resumo.mostrarExemplo}
        compact
      />

      <MedicamentoBalancoCharts
        compact
        balanco={resumo.balanco}
        pacientesPme={resumo.pacientesPme}
        planilhasEmCorrecao={resumo.planilhasEmCorrecao}
      />
      <MedicamentoDashboardCharts
        compact
        charts={resumo.charts}
        periodoLabel={resumo.balanco.periodoLabel}
      />
    </Box>
  )
}
