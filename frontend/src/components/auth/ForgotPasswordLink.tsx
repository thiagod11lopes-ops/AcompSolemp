import { useState } from 'react'
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
import { authService } from '@/services/authService'
import { useSupabaseDataSource } from '@/config/dataSource'
import { MARINHA_EMAIL_HINT } from '@/utils/email'
import { getAuthErrorMessage, mapSupabaseAuthError } from '@/supabase/authErrors'

interface ForgotPasswordButtonProps {
  emailHint?: string
  /** Botão destacado (padrão) ou link de texto */
  variant?: 'button' | 'link'
  fullWidth?: boolean
}

export function ForgotPasswordButton({
  emailHint = '',
  variant = 'button',
  fullWidth = true,
}: ForgotPasswordButtonProps) {
  const isSupabase = useSupabaseDataSource()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(emailHint)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const openDialog = () => {
    setEmail(emailHint)
    setError('')
    setSent(false)
    setOpen(true)
  }

  const handleSend = async () => {
    setLoading(true)
    setError('')
    try {
      if (!isSupabase) {
        throw new Error(
          'A recuperação de senha está disponível apenas com autenticação em nuvem (Supabase).',
        )
      }
      await authService.requestPasswordReset(email)
      setSent(true)
    } catch (e) {
      const mapped = mapSupabaseAuthError(e)
      const text = getAuthErrorMessage(mapped) || mapped.message
      setError(
        text && text !== '{}'
          ? text
          : 'Não foi possível enviar o link. Confira SMTP e Redirect URLs no Supabase.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {variant === 'link' ? (
        <Typography variant="body2" sx={{ textAlign: 'right', mt: 0.5 }}>
          <Button variant="text" size="small" onClick={openDialog} sx={{ textTransform: 'none' }}>
            Esqueci a senha
          </Button>
        </Typography>
      ) : (
        <Button
          fullWidth={fullWidth}
          variant="outlined"
          color="inherit"
          onClick={openDialog}
          disabled={!isSupabase}
        >
          Esqueci a senha
        </Button>
      )}

      <Dialog open={open} onClose={() => !loading && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Recuperar senha</DialogTitle>
        <DialogContent>
          {sent ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              Se a conta existir, enviamos o link de redefinição para o Gmail de recuperação
              cadastrado. Verifique a caixa de entrada (e o spam).
            </Alert>
          ) : (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Informe o e-mail @marinha.mil.br da conta. O link de redefinição será enviado ao
                Gmail de recuperação cadastrado.
              </Typography>
              <TextField
                fullWidth
                type="email"
                label="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@marinha.mil.br"
                helperText={MARINHA_EMAIL_HINT}
                autoFocus
              />
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            {sent ? 'Fechar' : 'Cancelar'}
          </Button>
          {!sent && (
            <Button
              variant="contained"
              onClick={() => void handleSend()}
              disabled={loading || !email.trim()}
            >
              {loading ? 'Enviando...' : 'Enviar link'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
}

/** @deprecated use ForgotPasswordButton */
export const ForgotPasswordLink = ForgotPasswordButton
