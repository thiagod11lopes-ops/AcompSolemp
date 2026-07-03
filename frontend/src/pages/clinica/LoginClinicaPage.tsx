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
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'

const loginSchema = z.object({
  login: z.string().min(1, 'Informe o login'),
  senha: z.string().min(1, 'Informe a senha'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginClinicaPage() {
  const { login, logout } = useClinicaAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: 'clinica', senha: 'clinica123' },
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('')
      await login(data)
      const authUser = authService.getClinicaUser()
      if (!authUser || authUser.perfil !== 'CLINICA') {
        await logout()
        setError('Este login não é de usuário de clínica. Use o Portal do Gestor.')
        return
      }
      navigate('/clinica/pedidos')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao autenticar')
    }
  }

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <LocalHospitalIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Portal da Clínica
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Solicite materiais e acompanhe seus pedidos
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
          color="secondary"
          size="large"
          sx={{ mt: 3 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Entrando...' : 'Entrar na Clínica'}
        </Button>
      </form>

      <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
        É gestor?{' '}
        <Link component={RouterLink} to="/login">
          Acessar Portal do Gestor
        </Link>
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Demo: clinica / clinica123 (Clínica de Ortopedia)
      </Typography>
    </Box>
  )
}
