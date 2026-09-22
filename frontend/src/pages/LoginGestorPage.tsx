import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Stack,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import AnchorIcon from '@mui/icons-material/Anchor'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth, useGestorAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'
import { canAccessGestorRoute } from '@/utils/permissions'
import { useSupabaseDataSource } from '@/config/dataSource'
import { isMarinhaEmail, MARINHA_EMAIL_HINT, normalizeEmailKey } from '@/utils/email'
import { ForgotPasswordButton } from '@/components/auth/ForgotPasswordLink'
import { SignUpButton } from '@/components/auth/SignUpButton'
import { TeamEmailRecognizedModal } from '@/components/auth/TeamEmailRecognizedModal'
import { LOGIN_PERFIL_OPCOES, loginPerfilLabel } from '@/utils/loginPerfis'
import type { UserRole } from '@/types'

const PERFIS_LOGIN = [
  'GESTOR',
  'CLINICA',
  'MEDICAMENTO',
  'AUDITORIA',
  'CONTABILIDADE_IMH',
  'CONFECCAO_SOLEMP',
] as const

const localLoginSchema = z.object({
  perfil: z.enum(PERFIS_LOGIN),
  login: z.string().min(1, 'Informe o e-mail ou login'),
  senha: z.string().min(1, 'Informe a senha'),
})

const supabaseLoginSchema = z.object({
  perfil: z.enum(PERFIS_LOGIN),
  login: z
    .string()
    .min(1, 'Informe o e-mail')
    .refine(isMarinhaEmail, MARINHA_EMAIL_HINT),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

type LoginForm = z.infer<typeof localLoginSchema>

/**
 * Modal de entrada unificado: select de perfil + e-mail + senha.
 * Gestor cria o próprio banco; demais perfis usam o cadastro liberado pelo gestor.
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
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [recognizedEmail, setRecognizedEmail] = useState('')
  const [gestorEmail, setGestorEmail] = useState<string | null>(null)
  const [info, setInfo] = useState('')
  const [signUpOpenSignal, setSignUpOpenSignal] = useState(0)
  const lastAnnouncedEmail = useRef('')

  const {
    register: registerField,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(isSupabase ? supabaseLoginSchema : localLoginSchema),
    defaultValues: isSupabase
      ? { perfil: 'GESTOR', login: '', senha: '' }
      : { perfil: 'GESTOR', login: 'gestor', senha: 'gestor123' },
  })

  const emailHint = watch('login')
  const perfilSelecionado = watch('perfil')
  const isGestorSelecionado = perfilSelecionado === 'GESTOR'

  const perfilOpcao = useMemo(
    () => LOGIN_PERFIL_OPCOES.find((o) => o.perfil === perfilSelecionado),
    [perfilSelecionado],
  )

  useEffect(() => {
    if (!isSupabase || !isGestorSelecionado) return

    const raw = emailHint?.trim() ?? ''
    if (!isMarinhaEmail(raw)) return

    const normalized = normalizeEmailKey(raw)
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const access = await authService.getTeamEmailAccess(normalized)
          if (!access) return
          if (lastAnnouncedEmail.current === normalized) return
          lastAnnouncedEmail.current = normalized
          setRecognizedEmail(normalized)
          setGestorEmail(access.gestor_email)
          setInfo('')
          setTeamModalOpen(true)
        } catch {
          // Silencioso
        }
      })()
    }, 450)

    return () => window.clearTimeout(timer)
  }, [emailHint, isSupabase, isGestorSelecionado])

  const handleAcceptTeamInvite = () => {
    setTeamModalOpen(false)
    void authService.getTeamEmailAccess(recognizedEmail).then((access) => {
      const perfil = access?.perfil
      if (perfil && (PERFIS_LOGIN as readonly string[]).includes(perfil)) {
        setValue('perfil', perfil as LoginForm['perfil'])
      }
    })
    setInfo('Convite aceito. Selecione o perfil cadastrado e defina sua senha em Cadastrar-se.')
    setSignUpOpenSignal((n) => n + 1)
  }

  const handleDeclineTeamInvite = async () => {
    await authService.declineTeamInvite(recognizedEmail)
    lastAnnouncedEmail.current = ''
    setTeamModalOpen(false)
    setGestorEmail(null)
    setValue('perfil', 'GESTOR')
    setInfo(
      'Você saiu do cadastro desse gestor. Agora pode criar sua própria conta como Gestor e montar o seu banco de dados.',
    )
  }

  const finishGestorLogin = async () => {
    const authUser = authService.getGestorUser()
    if (!authUser || !canAccessGestorRoute(authUser.perfil)) {
      await logout()
      setError('Este perfil não tem acesso de Gestor. Selecione o perfil correto.')
      return
    }
    navigate(redirectTo && redirectTo.startsWith('/gestor') ? redirectTo : '/gestor/dashboard')
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('')

      if (data.perfil === 'GESTOR') {
        if (isSupabase) {
          const teamAccess = await authService.getTeamEmailAccess(data.login)
          if (teamAccess) {
            setValue('perfil', teamAccess.perfil as LoginForm['perfil'])
            throw new Error(
              `Este e-mail está na equipe de um gestor (${loginPerfilLabel(teamAccess.perfil as UserRole)}). Selecione esse perfil para entrar.`,
            )
          }
        }
        await login(data)
        await finishGestorLogin()
        return
      }

      const result = await loginWithEmailTimeline(
        data.login,
        isSupabase ? data.senha : data.senha || undefined,
        data.perfil,
      )
      navigate(redirectTo && !redirectTo.includes('/login') ? redirectTo : result.route, {
        replace: true,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao autenticar')
    }
  }

  const onEntrarSemSenha = async () => {
    try {
      setError('')
      setOpenAccessLoading(true)
      if (!isGestorSelecionado) {
        setError('“Entrar sem senha” está disponível apenas para Gestor (dados locais neste navegador).')
        return
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
    const perfil = perfilSelecionado

    if (perfil === 'GESTOR') {
      if (isSupabase) {
        const teamAccess = await authService.getTeamEmailAccess(values.email)
        if (teamAccess) {
          throw new Error(
            `Este e-mail já foi liberado por um gestor como ${loginPerfilLabel(teamAccess.perfil as UserRole)}. Selecione esse perfil e use Cadastrar-se.`,
          )
        }
      }
      await register({ login: values.email, senha: values.senha })
      await finishGestorLogin()
      return
    }

    const result = await registerWithEmailTimeline(values.email, values.senha, perfil)
    navigate(result.route, { replace: true })
  }

  const busy = isSubmitting || openAccessLoading

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <AnchorIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          AcompSOLEMP
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Entre com o e-mail cadastrado e o perfil correspondente
        </Typography>
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
        <FormControl fullWidth margin="normal" error={Boolean(errors.perfil)}>
          <InputLabel id="login-perfil-label">Entrar como</InputLabel>
          <Controller
            name="perfil"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                labelId="login-perfil-label"
                label="Entrar como"
                disabled={busy}
              >
                {LOGIN_PERFIL_OPCOES.map((opcao) => (
                  <MenuItem key={opcao.id} value={opcao.perfil}>
                    {opcao.label}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>

        {perfilOpcao?.isGestor && (
          <Alert severity="info" sx={{ mt: 1, mb: 0.5 }}>
            Como Gestor você cria o seu banco de dados e cadastra a equipe na aba Cadastros.
          </Alert>
        )}

        {!isGestorSelecionado && (
          <Alert severity="info" sx={{ mt: 1, mb: 0.5 }}>
            Use o e-mail @marinha.mil.br liberado pelo gestor em Cadastros como{' '}
            <strong>{loginPerfilLabel(perfilSelecionado)}</strong>.
          </Alert>
        )}

        <TextField
          fullWidth
          label={isSupabase || !isGestorSelecionado ? 'E-mail institucional' : 'Login'}
          type={isSupabase || !isGestorSelecionado ? 'email' : 'text'}
          margin="normal"
          placeholder={
            isSupabase || !isGestorSelecionado ? 'seuemail@marinha.mil.br' : undefined
          }
          helperText={
            errors.login?.message ??
            (isSupabase || !isGestorSelecionado ? MARINHA_EMAIL_HINT : undefined)
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

      {isGestorSelecionado && (
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
      )}

      {isSupabase && (
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <SignUpButton
            emailHint={recognizedEmail || emailHint}
            openSignal={signUpOpenSignal}
            helperText={
              isGestorSelecionado
                ? 'Cadastrar-se como Gestor cria o seu banco. Só funciona se o e-mail ainda não foi liberado em Cadastros por outro gestor.'
                : `Primeiro acesso: o gestor já deve ter cadastrado seu e-mail como ${loginPerfilLabel(perfilSelecionado)}.`
            }
            onSubmit={handleSignUp}
          />
        </Stack>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {isSupabase
          ? 'Equipe: e-mail liberado pelo gestor + perfil correto. Gestor: Cadastrar-se cria o banco da organização.'
          : 'Demo Gestor: gestor / gestor123. Demais perfis: e-mail cadastrado no AppData local.'}
      </Typography>

      <TeamEmailRecognizedModal
        open={teamModalOpen}
        email={recognizedEmail}
        gestorEmail={gestorEmail}
        onAccept={handleAcceptTeamInvite}
        onDecline={handleDeclineTeamInvite}
      />
    </Box>
  )
}
