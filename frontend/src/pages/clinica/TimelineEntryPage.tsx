import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { BrandLogo } from '@/components/common/BrandLogo'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useSupabaseDataSource } from '@/config/dataSource'
import { premiumTokens } from '@/theme/tokens'
import { MARINHA_EMAIL_HINT } from '@/utils/email'
import { ForgotPasswordButton } from '@/components/auth/ForgotPasswordLink'
import { SignUpButton } from '@/components/auth/SignUpButton'
import { TeamEmailRecognizedModal } from '@/components/auth/TeamEmailRecognizedModal'
import { useTeamEmailInvite } from '@/hooks/useTeamEmailInvite'

/**
 * Portão de acesso à Timeline — e-mail institucional cadastrado pelo gestor.
 */
export default function TimelineEntryPage() {
  const navigate = useNavigate()
  const { loginWithEmailTimeline, registerWithEmailTimeline } = useAuth()
  const isSupabase = useSupabaseDataSource()
  const [gateReady, setGateReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const {
    teamModalOpen,
    recognizedEmail,
    gestorEmail,
    recognizedPerfilLabels,
    pendingTeamInvite,
    info,
    setInfo,
    signUpOpenSignal,
    ensureTeamInviteAccepted,
    handleAcceptTeamInvite,
    handleDeclineTeamInvite,
  } = useTeamEmailInvite(email)

  useEffect(() => {
    let cancelled = false

    const abrirPorta = async () => {
      const impersonation = authService.getImpersonation()
      if (impersonation) {
        const clinica = authService.getClinicaUser()
        const ordenador = authService.getOrdenadorUser()
        const financeiro = authService.getFinanceiroUser()
        const user = clinica ?? ordenador ?? financeiro
        if (user) {
          const { getHomeRouteForPerfil } = await import('@/utils/perfilEtapa')
          if (!cancelled) navigate(getHomeRouteForPerfil(user.perfil), { replace: true })
          return
        }
      }

      setGateReady(false)
      setErro('')
      await authService.prepareTimelineEntry()
      if (!cancelled) setGateReady(true)
    }

    void abrirPorta()
    return () => {
      cancelled = true
    }
  }, [navigate])

  const handleEmailLogin = async () => {
    setLoading(true)
    setErro('')
    try {
      if (isSupabase) {
        const ok = await ensureTeamInviteAccepted(email)
        if (!ok) {
          setErro('Aceite o cadastro feito pelo gestor para continuar o primeiro acesso.')
          return
        }
      }
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

  const handleSignUp = async (values: { email: string; senha: string }) => {
    setErro('')
    if (isSupabase) {
      const ok = await ensureTeamInviteAccepted(values.email)
      if (!ok) {
        setErro('Aceite o cadastro feito pelo gestor para continuar o primeiro acesso.')
        return
      }
    }
    const result = await registerWithEmailTimeline(values.email, values.senha)
    navigate(result.route, { replace: true })
  }

  if (!gateReady) return <LoadingSpinner />

  const blockUntilInviteAccepted = pendingTeamInvite

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
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <BrandLogo />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Timeline de Materiais Consignados
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isSupabase
            ? 'E-mail @marinha.mil.br liberado pelo gestor. Use Entrar ou Cadastrar-se no primeiro acesso.'
            : 'Informe o e-mail @marinha.mil.br cadastrado pelo gestor.'}
        </Typography>

        {info && (
          <Alert severity="success" sx={{ mb: 2, textAlign: 'left' }} onClose={() => setInfo('')}>
            {info}
          </Alert>
        )}

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
            disabled={blockUntilInviteAccepted}
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
          disabled={
            loading ||
            blockUntilInviteAccepted ||
            !email.trim() ||
            (isSupabase && password.length < 6)
          }
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>

        {isSupabase && (
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            <SignUpButton
              emailHint={recognizedEmail || email}
              openSignal={signUpOpenSignal}
              disabled={blockUntilInviteAccepted}
              helperText={
                blockUntilInviteAccepted
                  ? 'Aceite o cadastro do gestor no aviso acima para liberar Entrar e Cadastrar-se.'
                  : 'O gestor libera o e-mail @marinha.mil.br. Ao aceitar, defina a senha para entrar na organização.'
              }
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

      <TeamEmailRecognizedModal
        open={teamModalOpen}
        email={recognizedEmail}
        gestorEmail={gestorEmail}
        perfilLabels={recognizedPerfilLabels}
        onAccept={handleAcceptTeamInvite}
        onDecline={handleDeclineTeamInvite}
      />
    </Box>
  )
}
