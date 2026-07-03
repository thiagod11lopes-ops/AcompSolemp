import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  Link,
} from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import GavelIcon from '@mui/icons-material/Gavel'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useOrdenadorAuth } from '@/contexts/AuthContext'

const loginSchema = z.object({
  login: z.string().min(1, 'Informe o nome de acesso'),
  senha: z.string().min(1, 'Informe a senha'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginOrdenadorPage() {
  const { login } = useOrdenadorAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    '/ordenador/timelines'
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('')
      await login(data)
      navigate(redirectTo)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao autenticar')
    }
  }

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <GavelIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Ordenador de Despesa
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Assinatura de SOLEMP de todas as clínicas
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
          label="Nome de acesso"
          margin="normal"
          {...register('login')}
          error={Boolean(errors.login)}
          helperText={errors.login?.message ?? 'Login informado pelo gestor no cadastro'}
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
          color="warning"
          size="large"
          sx={{ mt: 3 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Entrando...' : 'Entrar como Ordenador'}
        </Button>
      </form>

      <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
        É gestor?{' '}
        <Link component={RouterLink} to="/login">
          Portal do Gestor
        </Link>
      </Typography>
    </Box>
  )
}
