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
import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useGestorAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'
import { canAccessGestorRoute } from '@/utils/permissions'
import { useSupabaseDataSource } from '@/config/dataSource'
import { isMarinhaEmail, MARINHA_EMAIL_HINT } from '@/utils/email'
import { ForgotPasswordButton } from '@/components/auth/ForgotPasswordLink'
import { SignUpButton } from '@/components/auth/SignUpButton'

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
  const { login, register, logout } = useGestorAuth()
  const isSupabase = useSupabaseDataSource()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    '/gestor/dashboard'
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

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

  const finishLogin = async () => {
    const authUser = authService.getGestorUser()
    if (!authUser || !canAccessGestorRoute(authUser.perfil)) {
      await logout()
      setError('Este login é exclusivo do Portal do Gestor. Use o Portal da Clínica.')
      return
    }
    navigate(redirectTo)
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('')
      await login(data)
      await finishLogin()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao autenticar')
    }
  }

  const handleSignUp = async (values: { email: string; senha: string }) => {
    setError('')
    await register({ login: values.email, senha: values.senha })
    await finishLogin()
  }

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
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      {isSupabase && (
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <SignUpButton
            emailHint={emailHint}
            helperText="Crie a organização do gestor com e-mail @marinha.mil.br e senha."
            onSubmit={handleSignUp}
          />
        </Stack>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" sx={{ textAlign: 'center' }}>
        É da clínica?{' '}
        <Link component={RouterLink} to="/clinica/timeline">
          Acessar Timeline (Clínica / Ordenador)
        </Link>
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        {isSupabase
          ? 'Use Entrar se já tem conta, ou Cadastrar-se no primeiro acesso com @marinha.mil.br.'
          : 'Demo: gestor / gestor123 ou admin / admin123'}
      </Typography>
    </Box>
  )
}
