import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import LoginIcon from '@mui/icons-material/Login'
import {
  listActiveGestores,
  listGestorTeamEmails,
  setAccountPaused,
  type ActiveGestorRow,
  type GestorTeamEmailRow,
} from '@/data/persistence/supabaseAdmin'
import { SUPER_ADMIN_EMAIL } from '@/utils/email'
import { useAuth } from '@/contexts/AuthContext'

interface SuperAdminGestoresDialogProps {
  open: boolean
  onClose: () => void
}

export function SuperAdminGestoresDialog({ open, onClose }: SuperAdminGestoresDialogProps) {
  const navigate = useNavigate()
  const { startImpersonation } = useAuth()
  const [loading, setLoading] = useState(false)
  const [enteringEmail, setEnteringEmail] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [gestores, setGestores] = useState<ActiveGestorRow[]>([])
  const [selectedGestor, setSelectedGestor] = useState<ActiveGestorRow | null>(null)
  const [team, setTeam] = useState<GestorTeamEmailRow[]>([])
  const [busyEmail, setBusyEmail] = useState<string | null>(null)

  const loadGestores = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setGestores(await listActiveGestores())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os gestores')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTeam = useCallback(async (gestorEmail: string) => {
    setLoading(true)
    setError('')
    try {
      setTeam(await listGestorTeamEmails(gestorEmail))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar a equipe')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setSelectedGestor(null)
      setTeam([])
      setError('')
      setEnteringEmail(null)
      return
    }
    void loadGestores()
  }, [open, loadGestores])

  const handleSelectGestor = async (gestor: ActiveGestorRow) => {
    setSelectedGestor(gestor)
    await loadTeam(gestor.email)
  }

  const handleEnterAs = async (email: string) => {
    setEnteringEmail(email)
    setError('')
    try {
      const result = await startImpersonation(email)
      onClose()
      navigate(result.route, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar como este e-mail')
    } finally {
      setEnteringEmail(null)
    }
  }

  const handleTogglePause = async (email: string, paused: boolean) => {
    if (email === SUPER_ADMIN_EMAIL) return
    setBusyEmail(email)
    setError('')
    try {
      const next = await setAccountPaused(email, paused)
      setTeam((rows) => rows.map((row) => (row.email === email ? { ...row, paused: next } : row)))
      setGestores((rows) =>
        rows.map((row) => (row.email === email ? { ...row, paused: next } : row)),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível alterar a pausa')
    } finally {
      setBusyEmail(null)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>
        {selectedGestor ? `Equipe de ${selectedGestor.email}` : 'Gestores ativos'}
      </DialogTitle>
      <DialogContent dividers>
        {selectedGestor && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => {
              setSelectedGestor(null)
              setTeam([])
              void loadGestores()
            }}
            sx={{ mb: 1.5, textTransform: 'none' }}
          >
            Voltar à lista de gestores
          </Button>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {selectedGestor
            ? 'Use o ícone de entrar ao lado do play/pause para abrir o sistema como esse e-mail.'
            : 'Clique em um gestor para ver a equipe. Use o ícone de entrar para acessar como ele.'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : selectedGestor ? (
          <List disablePadding>
            {team.length === 0 ? (
              <Typography color="text.secondary">Nenhum e-mail encontrado.</Typography>
            ) : (
              team.map((row) => {
                const isSelf = row.email === SUPER_ADMIN_EMAIL
                const entering = enteringEmail === row.email
                return (
                  <Box key={row.email}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 1.25,
                        px: 0.5,
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Typography sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
                            {row.email}
                          </Typography>
                          {row.is_gestor && <Chip size="small" label="Gestor" color="primary" />}
                          {row.paused && <Chip size="small" label="Pausado" color="warning" />}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {row.perfil}
                          {row.nome ? ` · ${row.nome}` : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                        {row.paused ? (
                          <PauseCircleIcon fontSize="small" color="warning" />
                        ) : (
                          <PlayCircleIcon fontSize="small" color="success" />
                        )}
                        <Switch
                          checked={!row.paused}
                          disabled={isSelf || busyEmail === row.email}
                          onChange={(_, checked) => void handleTogglePause(row.email, !checked)}
                          slotProps={{
                            input: {
                              'aria-label': row.paused ? 'Reativar conta' : 'Pausar conta',
                            },
                          }}
                        />
                        <Tooltip title={row.paused ? 'Conta pausada' : 'Entrar como este e-mail'}>
                          <span>
                            <IconButton
                              color="primary"
                              size="small"
                              disabled={Boolean(enteringEmail) || row.paused || isSelf}
                              onClick={() => void handleEnterAs(row.email)}
                              aria-label="Entrar como este e-mail"
                            >
                              {entering ? (
                                <CircularProgress size={18} />
                              ) : (
                                <LoginIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                    <Divider />
                  </Box>
                )
              })
            )}
          </List>
        ) : (
          <List disablePadding>
            {gestores.length === 0 ? (
              <Typography color="text.secondary">Nenhum gestor ativo no sistema.</Typography>
            ) : (
              gestores.map((gestor) => {
                const entering = enteringEmail === gestor.email
                return (
                  <Box key={gestor.tenant_id}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 0.5,
                        px: 0.5,
                      }}
                    >
                      <ListItemButton
                        onClick={() => void handleSelectGestor(gestor)}
                        sx={{ flex: 1, minWidth: 0, borderRadius: 1 }}
                      >
                        <Box sx={{ width: '100%' }}>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Typography sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
                              {gestor.email}
                            </Typography>
                            {gestor.paused && (
                              <Chip size="small" label="Pausado" color="warning" />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Org {gestor.org_code} · {gestor.team_count} e-mail(s) na equipe
                          </Typography>
                        </Box>
                      </ListItemButton>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                        {gestor.paused ? (
                          <PauseCircleIcon fontSize="small" color="warning" />
                        ) : (
                          <PlayCircleIcon fontSize="small" color="success" />
                        )}
                        <Switch
                          checked={!gestor.paused}
                          disabled={busyEmail === gestor.email}
                          onChange={(_, checked) =>
                            void handleTogglePause(gestor.email, !checked)
                          }
                          slotProps={{
                            input: {
                              'aria-label': gestor.paused ? 'Reativar conta' : 'Pausar conta',
                            },
                          }}
                        />
                        <Tooltip title={gestor.paused ? 'Conta pausada' : 'Entrar como este gestor'}>
                          <span>
                            <IconButton
                              color="primary"
                              size="small"
                              disabled={Boolean(enteringEmail) || gestor.paused}
                              onClick={() => void handleEnterAs(gestor.email)}
                              aria-label="Entrar como este gestor"
                            >
                              {entering ? (
                                <CircularProgress size={18} />
                              ) : (
                                <LoginIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                    <Divider />
                  </Box>
                )
              })
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
