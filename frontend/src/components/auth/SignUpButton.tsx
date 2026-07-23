import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { MARINHA_EMAIL_HINT } from '@/utils/email'

export interface SignUpFormValues {
  email: string
  senha: string
}

interface SignUpButtonProps {
  emailHint?: string
  fullWidth?: boolean
  disabled?: boolean
  helperText?: string
  onSubmit: (values: SignUpFormValues) => Promise<void>
}

export function SignUpButton({
  emailHint = '',
  fullWidth = true,
  disabled = false,
  helperText = 'Crie sua conta com e-mail @marinha.mil.br e senha (mínimo 6 caracteres).',
  onSubmit,
}: SignUpButtonProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(emailHint)
  const [senha, setSenha] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) setEmail(emailHint)
  }, [open, emailHint])

  const openDialog = () => {
    setEmail(emailHint)
    setSenha('')
    setConfirm('')
    setError('')
    setOpen(true)
  }

  const handleRegister = async () => {
    setError('')
    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (senha !== confirm) {
      setError('As senhas não coincidem')
      return
    }
    setLoading(true)
    try {
      await onSubmit({ email, senha })
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        fullWidth={fullWidth}
        variant="outlined"
        color="primary"
        onClick={openDialog}
        disabled={disabled}
      >
        Cadastrar-se
      </Button>

      <Dialog open={open} onClose={() => !loading && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Cadastrar-se</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {helperText}
            </Typography>
            <TextField
              fullWidth
              type="email"
              label="E-mail institucional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@marinha.mil.br"
              helperText={MARINHA_EMAIL_HINT}
              margin="dense"
              autoFocus
            />
            <TextField
              fullWidth
              type="password"
              label="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              margin="dense"
              helperText="Mínimo de 6 caracteres"
            />
            <TextField
              fullWidth
              type="password"
              label="Confirmar senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              margin="dense"
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleRegister()}
            disabled={loading || !email.trim() || !senha}
          >
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
