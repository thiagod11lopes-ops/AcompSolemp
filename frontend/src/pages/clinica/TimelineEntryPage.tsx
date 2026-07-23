import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import TimelineIcon from '@mui/icons-material/Timeline'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useSupabaseDataSource } from '@/config/dataSource'
import { premiumTokens } from '@/theme/tokens'
import { MARINHA_EMAIL_HINT } from '@/utils/email'
import { ForgotPasswordButton } from '@/components/auth/ForgotPasswordLink'
import { SignUpButton } from '@/components/auth/SignUpButton'

/**
 * Portão de acesso à Timeline — e-mail institucional cadastrado pelo gestor.
 */
export default function TimelineEntryPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { loginWithEmailTimeline, registerWithEmailTimeline } = useAuth()
  const isSupabase = useSupabaseDataSource()
  const [gateReady, setGateReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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

  const handleEmailLogin = async () => {
    setLoading(true)
    setErro('')
    try {
      const result = await loginWithEmailTimeline(
        email,
        isSupabase ? password : undefined,
      )
      navigate(result.route, { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (values: {
    email: string
    recoveryEmail: string
    senha: string
  }) => {
    setErro('')
    const result = await registerWithEmailTimeline(
      values.email,
      values.senha,
      values.recoveryEmail,
    )
    navigate(result.route, { replace: true })
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

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isSupabase
            ? 'E-mail @marinha.mil.br liberado pelo gestor. Use Entrar ou Cadastrar-se no primeiro acesso.'
            : 'Informe o e-mail @marinha.mil.br cadastrado pelo gestor.'}
        </Typography>
        <TextField
          fullWidth
          type="email"
          label="E-mail institucional"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seuemail@marinha.mil.br"
          helperText={MARINHA_EMAIL_HINT}
          sx={{ mb: 2 }}
        />
        {isSupabase && (
          <TextField
            fullWidth
            type="password"
            label="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 0.5 }}
          />
        )}
        {isSupabase && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <ForgotPasswordButton emailHint={email} variant="link" fullWidth={false} />
          </Box>
        )}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={() => void handleEmailLogin()}
          disabled={loading || !email.trim() || (isSupabase && password.length < 6)}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>

        {isSupabase && (
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            <SignUpButton
              emailHint={email}
              helperText="O gestor libera o e-mail @marinha.mil.br. Informe também um Gmail para receber a recuperação de senha."
              onSubmit={handleSignUp}
            />
          </Stack>
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
