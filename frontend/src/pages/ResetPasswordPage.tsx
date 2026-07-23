import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material'
import AnchorIcon from '@mui/icons-material/Anchor'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { authService } from '@/services/authService'
import { useSupabaseDataSource } from '@/config/dataSource'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function ResetPasswordPage() {
  const isSupabase = useSupabaseDataSource()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [sessionOk, setSessionOk] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (!isSupabase) {
        if (!cancelled) {
          setReady(true)
          setSessionOk(false)
        }
        return
      }
      const session = await authService.waitForPasswordRecoverySession()
      if (!cancelled) {
        setSessionOk(Boolean(session))
        setReady(true)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [isSupabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem')
      return
    }
    setLoading(true)
    try {
      await authService.completePasswordReset(password)
      setSuccess(true)
      window.setTimeout(() => navigate('/login', { replace: true }), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível redefinir a senha')
    } finally {
      setLoading(false)
    }
  }

  if (!ready) return <LoadingSpinner />

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <AnchorIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Redefinir senha
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Defina uma nova senha para o seu e-mail @marinha.mil.br
        </Typography>
      </Box>

      {!isSupabase && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          A recuperação de senha exige autenticação em nuvem (Supabase).
        </Alert>
      )}

      {isSupabase && !sessionOk && !success && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Link inválido ou expirado. Solicite uma nova recuperação de senha na tela de login.
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Senha atualizada. Redirecionando para o login...
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isSupabase && sessionOk && !success && (
        <form onSubmit={(e) => void handleSubmit(e)}>
          <TextField
            fullWidth
            type="password"
            label="Nova senha"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Mínimo de 6 caracteres"
            autoFocus
          />
          <TextField
            fullWidth
            type="password"
            label="Confirmar senha"
            margin="normal"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </Button>
        </form>
      )}

      <Typography variant="body2" sx={{ textAlign: 'center', mt: 2 }}>
        <RouterLink to="/login">Voltar ao login do gestor</RouterLink>
        {' · '}
        <RouterLink to="/clinica/timeline">Timeline</RouterLink>
      </Typography>
    </Box>
  )
}
