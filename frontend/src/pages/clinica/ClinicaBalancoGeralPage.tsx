import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import PreviewIcon from '@mui/icons-material/Preview'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { MedicamentoBalancoGeralView } from '@/components/clinica/MedicamentoBalancoGeralView'
import { MedicamentoPeriodoToolbar } from '@/components/clinica/MedicamentoPeriodoToolbar'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { useClinicas } from '@/hooks/useCadastros'
import { useMedicamentoPmeResumo } from '@/hooks/useMedicamentoPmeResumo'
import GestorBalancoPage from '@/pages/GestorBalancoPage'
import { downloadMedicamentoBalancoPdf } from '@/utils/medicamentoBalancoPdf'
import { premiumTokens } from '@/theme/tokens'

/** Balanço da clínica logada (medicamento = gráficos PME; demais = balanço dos processos). */
export default function ClinicaBalancoGeralPage() {
  const { user, isLoading: authLoading } = useClinicaAuth()
  const { mapPath } = usePortalPaths()
  const { data: clinicas = [], isLoading: clinicasLoading } = useClinicas()
  const clinica = clinicas.find((c) => c.id === user?.clinicaId)
  const isMedicamento = user?.perfil === 'MEDICAMENTO' || clinica?.tipo === 'medicamento'
  const nomeClinica = clinica?.nome?.trim() || 'sua clínica'
  const resumo = useMedicamentoPmeResumo(user?.clinicaId ?? '', isMedicamento)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [pdfErro, setPdfErro] = useState<string | null>(null)

  if (authLoading || clinicasLoading) return <LoadingSpinner />

  if (!user?.clinicaId) {
    return <Navigate to={mapPath('/clinica/timelines')} replace />
  }

  if (!isMedicamento) {
    return (
      <GestorBalancoPage
        clinicaId={user.clinicaId}
        metricsEnabled={Boolean(user.clinicaId)}
        hideRankingClinicas
        title="Balanço"
        subtitle={`Balanço exclusivo de ${nomeClinica}`}
      />
    )
  }

  const handleGerarPdf = async () => {
    setPdfErro(null)
    setGerandoPdf(true)
    try {
      await downloadMedicamentoBalancoPdf({
        balanco: resumo.balanco,
        charts: resumo.charts,
        clinicaNome: nomeClinica,
      })
    } catch (err) {
      setPdfErro(err instanceof Error ? err.message : 'Não foi possível gerar o PDF.')
    } finally {
      setGerandoPdf(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Balanço"
        subtitle={
          resumo.mostrarExemplo
            ? `Pré-visualização com dados de exemplo · ${resumo.balanco.periodoLabel}`
            : `Balanço geral PME · ${nomeClinica} · ${resumo.balanco.periodoLabel}`
        }
        titleAdornment={<AccountBalanceIcon color="primary" fontSize="small" />}
        action={
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Tooltip
              title={
                resumo.mostrarExemplo
                  ? 'Voltar aos dados reais'
                  : 'Ver como fica o balanço com dados de exemplo'
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
            <Button
              size="small"
              variant="contained"
              startIcon={
                gerandoPdf ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />
              }
              onClick={() => void handleGerarPdf()}
              disabled={gerandoPdf}
              sx={{
                textTransform: 'none',
                fontWeight: 800,
                borderRadius: 2,
                px: 2,
                background: `linear-gradient(135deg, ${premiumTokens.primaryDark}, ${premiumTokens.primary})`,
              }}
            >
              {gerandoPdf ? 'Gerando PDF…' : 'Gerar PDF do período'}
            </Button>
          </Box>
        }
      />

      {resumo.mostrarExemplo ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Exibindo dados fictícios para demonstração. Isso não altera estoque, IMH nem pedidos.
        </Alert>
      ) : null}

      {pdfErro ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPdfErro(null)}>
          {pdfErro}
        </Alert>
      ) : null}

      {resumo.planilhasError && !resumo.mostrarExemplo ? (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          Não foi possível carregar as planilhas. Os totais podem ficar zerados até recarregar.
        </Typography>
      ) : null}

      <MedicamentoPeriodoToolbar
        idPrefix="balanco-pme"
        periodoTipo={resumo.periodoTipo}
        onPeriodoTipo={resumo.setPeriodoTipo}
        referencia={resumo.referencia}
        onReferencia={resumo.setReferencia}
        anos={resumo.anos}
        mostrarExemplo={resumo.mostrarExemplo}
      />

      <Box sx={{ mt: 2 }}>
        <MedicamentoBalancoGeralView
          balanco={resumo.balanco}
          charts={resumo.charts}
          clinicaNome={nomeClinica}
        />
      </Box>
    </Box>
  )
}
