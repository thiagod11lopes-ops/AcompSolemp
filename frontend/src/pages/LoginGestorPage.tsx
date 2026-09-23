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
import {
  clearTeamInviteAccepted,
  isTeamInviteAccepted,
  markTeamInviteAccepted,
} from '@/utils/teamInviteAcceptance'
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
  const [recognizedPerfil, setRecognizedPerfil] = useState<UserRole | null>(null)
  /** E-mail da equipe reconhecido e ainda sem aceite neste navegador. */
  const [pendingTeamInvite, setPendingTeamInvite] = useState(false)
  const [info, setInfo] = useState('')
  const [signUpOpenSignal, setSignUpOpenSignal] = useState(0)
  const emailLookupSeq = useRef(0)

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

  const recognizedPerfilLabel = useMemo(
    () => (recognizedPerfil ? loginPerfilLabel(recognizedPerfil) : null),
    [recognizedPerfil],
  )

  /** E-mail liberado pelo gestor: modal no primeiro acesso (qualquer perfil) até aceitar. */
  useEffect(() => {
    if (!isSupabase) return

    const raw = emailHint?.trim() ?? ''
    if (!isMarinhaEmail(raw)) {
      setPendingTeamInvite(false)
      return
    }

    const normalized = normalizeEmailKey(raw)
    if (isTeamInviteAccepted(normalized)) {
      setPendingTeamInvite(false)
      return
    }

    const seq = ++emailLookupSeq.current
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const access = await authService.getTeamEmailAccess(normalized)
          if (seq !== emailLookupSeq.current) return
          if (!access) {
            setPendingTeamInvite(false)
            return
          }
          setRecognizedEmail(normalized)
          setGestorEmail(access.gestor_email)
          const perfil = access.perfil as UserRole
          setRecognizedPerfil(
            (PERFIS_LOGIN as readonly string[]).includes(perfil) ? perfil : null,
          )
          setPendingTeamInvite(true)
          setInfo('')
          setTeamModalOpen(true)
        } catch {
          // Silencioso
        }
      })()
    }, 450)

    return () => window.clearTimeout(timer)
  }, [emailHint, isSupabase])

  const openTeamInviteModal = (
    email: string,
    access: { gestor_email: string | null; perfil: string },
  ) => {
    setRecognizedEmail(email)
    setGestorEmail(access.gestor_email)
    const perfil = access.perfil as UserRole
    setRecognizedPerfil((PERFIS_LOGIN as readonly string[]).includes(perfil) ? perfil : null)
    setPendingTeamInvite(true)
    setTeamModalOpen(true)
  }

  const ensureTeamInviteAccepted = async (email: string): Promise<boolean> => {
    if (!isSupabase) return true
    if (!isMarinhaEmail(email)) return true
    const normalized = normalizeEmailKey(email)
    if (isTeamInviteAccepted(normalized)) {
      setPendingTeamInvite(false)
      return true
    }
    const access = await authService.getTeamEmailAccess(normalized)
    if (!access) return true
    openTeamInviteModal(normalized, access)
    setError('Aceite o cadastro feito pelo gestor para continuar o primeiro acesso.')
    return false
  }

  const handleAcceptTeamInvite = () => {
    markTeamInviteAccepted(recognizedEmail)
    setPendingTeamInvite(false)
    setTeamModalOpen(false)
    if (recognizedPerfil) {
      setValue('perfil', recognizedPerfil as LoginForm['perfil'])
    }
    setInfo(
      'Cadastro aceito. Defina sua senha em Cadastrar-se (primeiro acesso) ou use Entrar se já tiver senha.',
    )
    setSignUpOpenSignal((n) => n + 1)
  }

  const handleDeclineTeamInvite = async () => {
    await authService.declineTeamInvite(recognizedEmail)
    clearTeamInviteAccepted(recognizedEmail)
    setTeamModalOpen(false)
    setGestorEmail(null)
    setRecognizedPerfil(null)
    setPendingTeamInvite(false)
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
            const ok = await ensureTeamInviteAccepted(data.login)
            if (!ok) {
              setValue('perfil', teamAccess.perfil as LoginForm['perfil'])
              return
            }
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

      const ok = await ensureTeamInviteAccepted(data.login)
      if (!ok) return

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
          const ok = await ensureTeamInviteAccepted(values.email)
          if (!ok) {
            setValue('perfil', teamAccess.perfil as LoginForm['perfil'])
            return
          }
          throw new Error(
            `Este e-mail já foi liberado por um gestor como ${loginPerfilLabel(teamAccess.perfil as UserRole)}. Selecione esse perfil e use Cadastrar-se.`,
          )
        }
      }
      await register({ login: values.email, senha: values.senha })
      await finishGestorLogin()
      return
    }

    const ok = await ensureTeamInviteAccepted(values.email)
    if (!ok) return

    const result = await registerWithEmailTimeline(values.email, values.senha, perfil)
    navigate(result.route, { replace: true })
  }

  const busy = isSubmitting || openAccessLoading
  const blockUntilInviteAccepted = pendingTeamInvite

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
          disabled={busy || blockUntilInviteAccepted}
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
          disabled={busy || blockUntilInviteAccepted}
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
            disabled={blockUntilInviteAccepted}
            helperText={
              blockUntilInviteAccepted
                ? 'Aceite o cadastro do gestor no aviso acima para liberar Entrar e Cadastrar-se.'
                : isGestorSelecionado
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
        perfilLabel={recognizedPerfilLabel}
        onAccept={handleAcceptTeamInvite}
        onDecline={handleDeclineTeamInvite}
      />
    </Box>
  )
}
