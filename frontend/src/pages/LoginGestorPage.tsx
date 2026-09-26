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
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import AnchorIcon from '@mui/icons-material/Anchor'
import { useForm } from 'react-hook-form'
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
import { loginPerfilLabel } from '@/utils/loginPerfis'
import { premiumTokens } from '@/theme/tokens'
import {
  clearTeamInviteAccepted,
  isTeamInviteAccepted,
  markTeamInviteAccepted,
} from '@/utils/teamInviteAcceptance'
import type { UserRole } from '@/types'

const PERFIS_EQUIPE = [
  'CLINICA',
  'MEDICAMENTO',
  'AUDITORIA',
  'CONTABILIDADE_IMH',
  'CONFECCAO_SOLEMP',
  'FINANCEIRO',
  'EMPENHADO',
] as const

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
 * - E-mail livre → cria/entra como Gestor com banco próprio.
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
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(isSupabase ? supabaseLoginSchema : localLoginSchema),
    defaultValues: isSupabase
      ? { login: '', senha: '' }
      : { login: 'gestor', senha: 'gestor123' },
  })

  const emailHint = watch('login')

  const recognizedPerfilLabel = useMemo(
    () => (recognizedPerfil ? loginPerfilLabel(recognizedPerfil) : null),
    [recognizedPerfil],
  )

  /** E-mail liberado pelo gestor: modal no primeiro acesso até aceitar. */
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
            (PERFIS_EQUIPE as readonly string[]).includes(perfil) ? perfil : null,
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
    setRecognizedPerfil((PERFIS_EQUIPE as readonly string[]).includes(perfil) ? perfil : null)
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
    setInfo(
      'Você saiu do cadastro desse gestor. Agora pode criar sua própria conta como Gestor e montar o seu banco de dados.',
    )
  }

  const finishGestorLogin = async () => {
    const authUser = authService.getGestorUser()
    if (!authUser || !canAccessGestorRoute(authUser.perfil)) {
      await logout()
      setError('Este e-mail não tem acesso de Gestor. Se foi cadastrado por um gestor, use o e-mail liberado em Cadastros.')
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
        const teamAccess = await authService.getTeamEmailAccess(data.login)
        if (teamAccess) {
          const ok = await ensureTeamInviteAccepted(data.login)
          if (!ok) return
          const result = await loginWithEmailTimeline(data.login, data.senha)
          finishTimelineLogin(result.route)
          return
        }
        await login(data)
        await finishGestorLogin()
        return
      }

      // Modo local: tenta timeline pelo e-mail; senão entra como gestor.
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
        if (!ok) return
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
      <Box sx={{ textAlign: 'center', mb: 3.5 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 1.75,
            borderRadius: '18px',
            display: 'grid',
            placeItems: 'center',
            background: `linear-gradient(145deg, ${premiumTokens.primary} 0%, ${premiumTokens.primaryDark} 100%)`,
            boxShadow: `0 12px 28px rgba(37, 99, 235, 0.35)`,
          }}
        >
          <AnchorIcon sx={{ fontSize: 34, color: '#FFFFFF' }} />
        </Box>
        <Typography
          variant="h5"
          sx={{ fontWeight: 800, letterSpacing: '-0.03em', color: '#0F172A' }}
        >
          AcompSOLEMP
        </Typography>
        <Typography
          variant="body2"
          sx={{ mt: 0.75, color: '#475569', lineHeight: 1.5, px: 1 }}
        >
          Entre com o e-mail institucional. O sistema reconhece se você é Gestor ou
          equipe cadastrada.
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
        {!pendingTeamInvite && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            E-mail ainda não liberado por um gestor cria o seu próprio banco (Portal do
            Gestor). E-mail cadastrado em Cadastros entra nos setores autorizados.
          </Alert>
        )}

        <TextField
          fullWidth
          label={isSupabase ? 'E-mail institucional' : 'E-mail ou login'}
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
                ? 'Aceite o cadastro do gestor no aviso acima para liberar Entrar e Cadastrar-se.'
                : 'Cadastrar-se: se o e-mail foi liberado pelo gestor, entra na equipe; senão, cria o banco do Gestor.'
            }
            onSubmit={handleSignUp}
          />
        </Stack>
      )}

      <Divider sx={{ my: 2.5, borderColor: 'rgba(15, 23, 42, 0.1)' }} />

      <Typography
        variant="caption"
        sx={{ display: 'block', color: '#64748B', lineHeight: 1.55 }}
      >
        {isSupabase
          ? 'Equipe: e-mail liberado pelo gestor. Gestor: Cadastrar-se com e-mail livre cria o banco da organização. Vários setores no mesmo cadastro aparecem como abas à esquerda após o login.'
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
