import {
  Box,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  Stack,
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '@/components/common/BrandLogo'
import { useAuth, useGestorAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'
import { canAccessGestorRoute } from '@/utils/permissions'
import { useSupabaseDataSource } from '@/config/dataSource'
import { isMarinhaEmail, MARINHA_EMAIL_HINT } from '@/utils/email'
import { ForgotPasswordButton } from '@/components/auth/ForgotPasswordLink'
import { SignUpButton } from '@/components/auth/SignUpButton'
import { TeamEmailRecognizedModal } from '@/components/auth/TeamEmailRecognizedModal'
import { EmailNaoCadastradoModal } from '@/components/auth/EmailNaoCadastradoModal'
import { useTeamEmailInvite } from '@/hooks/useTeamEmailInvite'

const localLoginSchema = z.object({
  login: z.string().min(1, 'Informe o e-mail ou login'),
  senha: z.string().min(1, 'Informe a senha'),
})

const supabaseLoginSchema = z.object({
  login: z
    .string()
    .min(1, 'Informe o e-mail')
    .refine(isMarinhaEmail, MARINHA_EMAIL_HINT),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

type LoginForm = z.infer<typeof localLoginSchema>

/**
 * Entrada unificada: só e-mail + senha.
 * - E-mail liberado pelo gestor → modal de aceite (1º acesso) e entra nos setores cadastrados.
 * - E-mail já gestor → entra no Portal do Gestor.
 * - E-mail não cadastrado → modal com Cadastrar (senha) ou Cancelar.
 */
export default function LoginGestorPage() {
  const { login, loginSemSenha, register, logout } = useGestorAuth()
  const { loginWithEmailTimeline, registerWithEmailTimeline } = useAuth()
  const isSupabase = useSupabaseDataSource()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? null
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [openAccessLoading, setOpenAccessLoading] = useState(false)

  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(isSupabase ? supabaseLoginSchema : localLoginSchema),
    defaultValues: isSupabase
      ? { login: '', senha: '' }
      : { login: 'gestor', senha: 'gestor123' },
  })

  const emailHint = watch('login')
  const {
    teamModalOpen,
    unregisteredModalOpen,
    recognizedEmail,
    gestorEmail,
    recognizedPerfilLabels,
    pendingTeamInvite,
    info,
    setInfo,
    signUpOpenSignal,
    ensureTeamInviteAccepted,
    ensureRegisteredOrSignup,
    handleAcceptTeamInvite,
    handleDeclineTeamInvite,
    handleCadastrarUnregistered,
    handleCancelarUnregistered,
  } = useTeamEmailInvite(emailHint)

  const finishGestorLogin = async () => {
    const authUser = authService.getGestorUser()
    if (!authUser || !canAccessGestorRoute(authUser.perfil)) {
      await logout()
      setError(
        'Este e-mail não tem acesso de Gestor. Se foi cadastrado por um gestor, use o e-mail liberado em Cadastros.',
      )
      return
    }
    navigate(redirectTo && redirectTo.startsWith('/gestor') ? redirectTo : '/gestor/dashboard')
  }

  const finishTimelineLogin = (route: string) => {
    navigate(redirectTo && !redirectTo.includes('/login') ? redirectTo : route, {
      replace: true,
    })
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('')

      if (isSupabase) {
        const allowed = await ensureRegisteredOrSignup(data.login)
        if (!allowed) return

        const teamAccess = await authService.getTeamEmailAccess(data.login)
        if (teamAccess) {
          const ok = await ensureTeamInviteAccepted(data.login)
          if (!ok) {
            setError('Aceite o cadastro feito pelo gestor para continuar o primeiro acesso.')
            return
          }
          const result = await loginWithEmailTimeline(data.login, data.senha)
          finishTimelineLogin(result.route)
          return
        }
        await login(data)
        await finishGestorLogin()
        return
      }

      try {
        const result = await loginWithEmailTimeline(
          data.login,
          data.senha || undefined,
        )
        finishTimelineLogin(result.route)
        return
      } catch {
        await login(data)
        await finishGestorLogin()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao autenticar')
    }
  }

  const onEntrarSemSenha = async () => {
    try {
      setError('')
      setOpenAccessLoading(true)
      if (isSupabase && emailHint?.trim() && isMarinhaEmail(emailHint)) {
        const allowed = await ensureRegisteredOrSignup(emailHint)
        if (!allowed) return
        const teamAccess = await authService.getTeamEmailAccess(emailHint)
        if (teamAccess) {
          setError(
            '“Entrar sem senha” é só para Gestor com dados locais. Este e-mail está na equipe de um gestor — use senha após aceitar o cadastro.',
          )
          return
        }
      }
      await loginSemSenha()
      await finishGestorLogin()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao entrar sem senha')
    } finally {
      setOpenAccessLoading(false)
    }
  }

  const handleSignUp = async (values: { email: string; senha: string }) => {
    setError('')

    if (isSupabase) {
      const teamAccess = await authService.getTeamEmailAccess(values.email)
      if (teamAccess) {
        const ok = await ensureTeamInviteAccepted(values.email)
        if (!ok) {
          setError('Aceite o cadastro feito pelo gestor para continuar o primeiro acesso.')
          return
        }
        const result = await registerWithEmailTimeline(values.email, values.senha)
        finishTimelineLogin(result.route)
        return
      }
      await register({ login: values.email, senha: values.senha })
      await finishGestorLogin()
      return
    }

    await register({ login: values.email, senha: values.senha })
    await finishGestorLogin()
  }

  const busy = isSubmitting || openAccessLoading
  const blockUntilInviteAccepted = pendingTeamInvite

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3.5 }}>
        <BrandLogo />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {info && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo('')}>
          {info}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          fullWidth
          label={isSupabase ? 'E-mail institucional' : 'E-mail ou login'}
          type={isSupabase ? 'email' : 'text'}
          margin="normal"
          helperText={errors.login?.message}
          {...registerField('login')}
          error={Boolean(errors.login)}
        />
        <TextField
          fullWidth
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          margin="normal"
          {...registerField('senha')}
          error={Boolean(errors.senha)}
          helperText={errors.senha?.message}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        {isSupabase && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5, mb: 1 }}>
            <ForgotPasswordButton emailHint={emailHint} variant="link" fullWidth={false} />
          </Box>
        )}
        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          sx={{
            mt: isSupabase ? 1 : 3,
            py: 1.35,
            fontWeight: 700,
            borderRadius: 2,
          }}
          disabled={busy || blockUntilInviteAccepted}
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <Button
        fullWidth
        variant="outlined"
        size="large"
        sx={{ mt: 1.5, py: 1.2, borderRadius: 2, fontWeight: 600 }}
        disabled={busy || blockUntilInviteAccepted}
        onClick={() => void onEntrarSemSenha()}
      >
        {openAccessLoading ? 'Entrando...' : 'Entrar sem senha'}
      </Button>

      {isSupabase && (
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <SignUpButton
            emailHint={recognizedEmail || emailHint}
            openSignal={signUpOpenSignal}
            disabled={blockUntilInviteAccepted}
            helperText={
              blockUntilInviteAccepted
                ? 'Responda ao convite do gestor (Sim ou Não) para liberar Entrar e Cadastrar-se.'
                : 'E-mail novo: use Cadastrar no aviso (ou Cadastrar-se) para criar senha e virar Gestor com banco próprio.'
            }
            onSubmit={handleSignUp}
          />
        </Stack>
      )}

      <TeamEmailRecognizedModal
        open={teamModalOpen}
        email={recognizedEmail}
        gestorEmail={gestorEmail}
        perfilLabels={recognizedPerfilLabels}
        onAccept={handleAcceptTeamInvite}
        onDecline={handleDeclineTeamInvite}
      />

      <EmailNaoCadastradoModal
        open={unregisteredModalOpen}
        email={recognizedEmail || emailHint}
        onCadastrar={handleCadastrarUnregistered}
        onCancelar={handleCancelarUnregistered}
      />
    </Box>
  )
}
