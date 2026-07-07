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
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

const loginSchema = z.object({
  login: z.string().min(1, 'Informe o login'),
  senha: z.string().min(1, 'Informe a senha'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginGestorPage() {
  const { login, loginWithGoogle, logout, requiresGoogleAuth } = useGestorAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    '/gestor/dashboard'
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: requiresGoogleAuth
      ? { login: '', senha: '' }
      : { login: 'gestor', senha: 'gestor123' },
  })

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

  const handleGoogleLogin = async () => {
    try {
      setError('')
      setGoogleLoading(true)
      await loginWithGoogle()
      await finishLogin()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao autenticar com Google')
    } finally {
      setGoogleLoading(false)
    }
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

      {requiresGoogleAuth ? (
        <Box>
          <GoogleSignInButton
            onClick={handleGoogleLogin}
            loading={googleLoading}
            label="Entrar com Google"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Qualquer conta Google cria sua organização. No primeiro acesso você será o gestor geral.
          </Typography>
        </Box>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            label="Login"
            margin="normal"
            {...register('login')}
            error={Boolean(errors.login)}
            helperText={errors.login?.message}
          />
          <TextField
            fullWidth
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            margin="normal"
            {...register('senha')}
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
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar como Gestor'}
          </Button>
        </form>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" sx={{ textAlign: 'center' }}>
        É da clínica?{' '}
        <Link component={RouterLink} to="/clinica/timeline">
          Acessar Timeline (Clínica / Ordenador)
        </Link>
      </Typography>

      {!requiresGoogleAuth && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Demo: gestor / gestor123 ou admin / admin123
        </Typography>
      )}
    </Box>
  )
}
