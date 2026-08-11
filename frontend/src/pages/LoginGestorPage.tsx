import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  Link,
  Divider,
  Stack,
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import AnchorIcon from '@mui/icons-material/Anchor'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, useGestorAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'
import { canAccessGestorRoute } from '@/utils/permissions'
import { useSupabaseDataSource } from '@/config/dataSource'
import { isMarinhaEmail, MARINHA_EMAIL_HINT, normalizeEmailKey } from '@/utils/email'
import { ForgotPasswordButton } from '@/components/auth/ForgotPasswordLink'
import { SignUpButton } from '@/components/auth/SignUpButton'
import { TeamEmailRecognizedModal } from '@/components/auth/TeamEmailRecognizedModal'

const localLoginSchema = z.object({
  login: z.string().min(1, 'Informe o login'),
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

export default function LoginGestorPage() {
  const { login, loginSemSenha, register, logout } = useGestorAuth()
  const { loginWithEmailTimeline, registerWithEmailTimeline } = useAuth()
  const isSupabase = useSupabaseDataSource()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    '/gestor/dashboard'
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [openAccessLoading, setOpenAccessLoading] = useState(false)
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [recognizedEmail, setRecognizedEmail] = useState('')
  const lastAnnouncedEmail = useRef('')

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

  useEffect(() => {
    if (!isSupabase) return

    const raw = emailHint?.trim() ?? ''
    if (!isMarinhaEmail(raw)) {
      return
    }

    const normalized = normalizeEmailKey(raw)
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const access = await authService.getTeamEmailAccess(normalized)
          if (!access) return
          if (lastAnnouncedEmail.current === normalized) return
          lastAnnouncedEmail.current = normalized
          setRecognizedEmail(normalized)
          setTeamModalOpen(true)
        } catch {
          // Silencioso: falha de rede não deve bloquear o login
        }
      })()
    }, 450)

    return () => window.clearTimeout(timer)
  }, [emailHint, isSupabase])

  const finishGestorLogin = async () => {
    const authUser = authService.getGestorUser()
    if (!authUser || !canAccessGestorRoute(authUser.perfil)) {
      await logout()
      setError('Este login é exclusivo do Portal do Gestor. Use a Timeline.')
      return
    }
    navigate(redirectTo)
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('')

      // E-mail liberado em Cadastros → Timeline da organização do gestor (nunca novo gestor)
      if (isSupabase) {
        const teamAccess = await authService.getTeamEmailAccess(data.login)
        if (teamAccess) {
          const result = await loginWithEmailTimeline(data.login, data.senha)
          navigate(result.route, { replace: true })
          return
        }
      }

      await login(data)
      await finishGestorLogin()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao autenticar')
    }
  }

  const onEntrarSemSenha = async () => {
    try {
      setError('')
      setOpenAccessLoading(true)
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
        const result = await registerWithEmailTimeline(values.email, values.senha)
        navigate(result.route, { replace: true })
        return
      }
    }

    await register({ login: values.email, senha: values.senha })
    await finishGestorLogin()
  }

  const busy = isSubmitting || openAccessLoading

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <AnchorIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Portal do Gestor
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Acompanhamento global de processos SOLEMP
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          fullWidth
          label={isSupabase ? 'E-mail institucional' : 'Login'}
          type={isSupabase ? 'email' : 'text'}
          margin="normal"
          placeholder={isSupabase ? 'seuemail@marinha.mil.br' : undefined}
          helperText={
            errors.login?.message ?? (isSupabase ? MARINHA_EMAIL_HINT : undefined)
          }
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
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
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
          sx={{ mt: isSupabase ? 1 : 3 }}
          disabled={busy}
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <Button
        fullWidth
        variant="outlined"
        size="large"
        sx={{ mt: 1.5 }}
        disabled={busy}
        onClick={() => void onEntrarSemSenha()}
      >
        {openAccessLoading ? 'Entrando...' : 'Entrar sem senha'}
      </Button>

      {isSupabase && (
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <SignUpButton
            emailHint={emailHint}
            helperText="Se o gestor já cadastrou seu e-mail, você entra na Timeline da organização. Só vira gestor quem ainda não foi liberado em Cadastros."
            onSubmit={handleSignUp}
          />
        </Stack>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" sx={{ textAlign: 'center' }}>
        É da clínica / equipe?{' '}
        <Link component={RouterLink} to="/clinica/timeline">
          Acessar Timeline
        </Link>
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        {isSupabase
          ? 'E-mail liberado pelo gestor → Timeline. Novo gestor → Cadastrar-se só se o e-mail ainda não estiver em Cadastros. “Entrar sem senha” usa dados locais neste navegador.'
          : 'Demo: gestor / gestor123 ou admin / admin123'}
      </Typography>

      <TeamEmailRecognizedModal
        open={teamModalOpen}
        email={recognizedEmail}
        onClose={() => setTeamModalOpen(false)}
      />
    </Box>
  )
}
