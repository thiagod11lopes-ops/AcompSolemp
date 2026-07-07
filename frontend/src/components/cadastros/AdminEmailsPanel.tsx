import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUsuarios } from '@/hooks/useCadastros'
import { authService } from '@/services/authService'
import { usuarioCadastroService } from '@/services/usuarioCadastroService'

/** Permite vincular e-mail Google aos administradores (gestor/admin) antes do modo produção */
export function AdminEmailsPanel() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const { data: usuarios = [] } = useUsuarios()
  const [feedback, setFeedback] = useState('')
  const [erro, setErro] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const admins = useMemo(
    () =>
      usuarios.filter(
        (user) =>
          user.ativo && (user.perfil === 'ADMINISTRADOR' || user.perfil === 'GESTOR'),
      ),
    [usuarios],
  )

  const updateEmail = useMutation({
    mutationFn: ({ userId, email }: { userId: string; email: string }) =>
      usuarioCadastroService.updateUsuarioEmail(userId, email),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })

  if (admins.length === 0) return null

  const emProducao = authService.requiresGoogleAuth()

  const handleSave = async (userId: string) => {
    setErro('')
    setFeedback('')
    try {
      await updateEmail.mutateAsync({ userId, email: drafts[userId] ?? '' })
      setFeedback('E-mail atualizado com sucesso.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar e-mail')
    }
  }

  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
        bgcolor: alpha(theme.palette.warning.main, 0.06),
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        E-mails Google — Administradores
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {emProducao
          ? 'Em produção, gestores e administradores entram apenas com a conta Google cadastrada abaixo.'
          : 'Cadastre o e-mail Google de cada administrador antes de ativar VITE_DATA_SOURCE=firebase.'}
      </Typography>

      {erro && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}
      {feedback && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {feedback}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {admins.map((admin) => (
          <Box
            key={admin.id}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1.5,
              alignItems: { sm: 'center' },
            }}
          >
            <Typography variant="body2" sx={{ minWidth: 180, fontWeight: 600 }}>
              {admin.nome} ({admin.perfil === 'ADMINISTRADOR' ? 'Admin' : 'Gestor'})
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="email"
              label="E-mail Google"
              placeholder="seu.email@gmail.com"
              value={drafts[admin.id] ?? admin.email ?? ''}
              onChange={(e) =>
                setDrafts((prev) => ({ ...prev, [admin.id]: e.target.value }))
              }
            />
            <Button
              variant="contained"
              onClick={() => void handleSave(admin.id)}
              disabled={updateEmail.isPending}
              sx={{ flexShrink: 0 }}
            >
              Salvar
            </Button>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}
