import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import TimelineIcon from '@mui/icons-material/Timeline'
import GoogleIcon from '@mui/icons-material/Google'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useFirebaseDataSource } from '@/config/dataSource'
import { premiumTokens } from '@/theme/tokens'

/**
 * Portão de acesso à Timeline — login com Google (e-mail cadastrado pelo gestor).
 */
export default function TimelineEntryPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { loginWithGoogleTimeline, loginWithEmailTimeline } = useAuth()
  const isFirebase = useFirebaseDataSource()
  const [gateReady, setGateReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [devEmail, setDevEmail] = useState('')

  useEffect(() => {
    let cancelled = false

    const abrirPorta = async () => {
      setGateReady(false)
      setErro('')
      await authService.prepareTimelineEntry()
      if (!cancelled) setGateReady(true)
    }

    void abrirPorta()
    return () => {
      cancelled = true
    }
  }, [])

  const handleGoogleLogin = async () => {
    setLoading(true)
    setErro('')
    try {
      const result = await loginWithGoogleTimeline()
      navigate(result.route, { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  const handleDevEmailLogin = async () => {
    setLoading(true)
    setErro('')
    try {
      const result = await loginWithEmailTimeline(devEmail)
      navigate(result.route, { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  if (!gateReady) return <LoadingSpinner />

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background: premiumTokens.gradientAuth,
        backgroundAttachment: 'fixed',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          p: 4,
          borderRadius: `${premiumTokens.radius}px`,
          bgcolor: 'background.paper',
          border: `1px solid ${premiumTokens.border}`,
          boxShadow: premiumTokens.shadow,
          backdropFilter: 'blur(16px)',
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 2,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: 'primary.main',
          }}
        >
          <TimelineIcon sx={{ fontSize: 36 }} />
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
          AcompSOLEMP
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Timeline de Materiais Consignados
        </Typography>

        {isFirebase ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Entre com o Google cadastrado pelo gestor da sua organização.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={() => void handleGoogleLogin()}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? 'Entrando...' : 'Entrar com Google'}
            </Button>
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Modo local — informe o e-mail cadastrado pelo gestor.
            </Typography>
            <TextField
              fullWidth
              type="email"
              label="E-mail Google"
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={() => void handleDevEmailLogin()}
              disabled={loading || !devEmail.trim()}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </>
        )}

        {erro && (
          <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
            {erro}
          </Alert>
        )}
      </Box>
    </Box>
  )
}
