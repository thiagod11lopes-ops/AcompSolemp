import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Box, Typography, alpha, useTheme } from '@mui/material'
import TimelineIcon from '@mui/icons-material/Timeline'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PortalAccessModal } from '@/components/clinica/PortalAccessModal'
import { ClinicaLayout } from '@/layouts/ClinicaLayout'
import ClinicaTimelinePage from '@/pages/clinica/ClinicaTimelinePage'

export default function TimelineEntryPage() {
  const theme = useTheme()
  const { clinicaUser, ordenadorUser, financeiroUser, isLoading, logout } = useAuth()
  const [gateReady, setGateReady] = useState(false)
  const [autenticado, setAutenticado] = useState(false)

  useEffect(() => {
    const abrirPorta = async () => {
      authService.clearClinicaOrdenadorSessions()
      await logout('clinica')
      await logout('ordenador')
      await logout('financeiro')
      setAutenticado(false)
      setGateReady(true)
    }
    void abrirPorta()
  }, [logout])

  if (isLoading || !gateReady) return <LoadingSpinner />

  if (financeiroUser) {
    return <Navigate to="/financeiro/pagamentos" replace />
  }

  if (ordenadorUser) {
    return <Navigate to="/ordenador/timelines" replace />
  }

  if (autenticado && clinicaUser) {
    return (
      <ClinicaLayout>
        <ClinicaTimelinePage />
      </ClinicaLayout>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(160deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${theme.palette.background.default} 50%)`,
      }}
    >
      <Box sx={{ textAlign: 'center', px: 2, mb: 8 }}>
        <TimelineIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          AcompSOLEMP
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Timeline de Materiais Consignados
        </Typography>
      </Box>
      <PortalAccessModal
        open
        onClinicaSuccess={() => setAutenticado(true)}
      />
    </Box>
  )
}
