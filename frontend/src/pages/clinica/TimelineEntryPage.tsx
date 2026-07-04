import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Box, Typography, alpha, useTheme } from '@mui/material'
import TimelineIcon from '@mui/icons-material/Timeline'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { PortalAccessModal } from '@/components/clinica/PortalAccessModal'

/**
 * Portão público de acesso à timeline.
 * Sempre que a rota /clinica/timeline é aberta, encerra sessões de
 * clínica/setor/financeiro e exibe o modal de seleção de perfil + senha.
 */
export default function TimelineEntryPage() {
  const theme = useTheme()
  const location = useLocation()
  const { logout, isLoading } = useAuth()
  const [gateReady, setGateReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const abrirPorta = async () => {
      setGateReady(false)
      authService.clearClinicaOrdenadorSessions()
      await logout('clinica')
      await logout('ordenador')
      await logout('financeiro')
      if (!cancelled) setGateReady(true)
    }

    void abrirPorta()
    return () => {
      cancelled = true
    }
  }, [logout, location.key, location.pathname])

  if (isLoading || !gateReady) return <LoadingSpinner />

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
      <PortalAccessModal open />
    </Box>
  )
}
