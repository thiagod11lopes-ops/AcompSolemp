import { useCallback, useEffect, useState } from 'react'
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
  List,
  ListItemButton,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import {
  listActiveGestores,
  listGestorTeamEmails,
  setAccountPaused,
  type ActiveGestorRow,
  type GestorTeamEmailRow,
} from '@/data/persistence/supabaseAdmin'
import { SUPER_ADMIN_EMAIL } from '@/utils/email'

interface SuperAdminGestoresDialogProps {
  open: boolean
  onClose: () => void
}

export function SuperAdminGestoresDialog({ open, onClose }: SuperAdminGestoresDialogProps) {
  const [loading, setLoading] = useState(false)
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
      return
    }
    void loadGestores()
  }, [open, loadGestores])

  const handleSelectGestor = async (gestor: ActiveGestorRow) => {
    setSelectedGestor(gestor)
    await loadTeam(gestor.email)
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
            ? 'Pause ou reative qualquer e-mail desta organização (gestor ou equipe).'
            : 'Selecione um gestor para ver os e-mails cadastrados na organização dele.'}
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
                return (
                  <Box key={row.email}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        py: 1.25,
                        px: 0.5,
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
                            {row.email}
                          </Typography>
                          {row.is_gestor && <Chip size="small" label="Gestor" color="primary" />}
                          {row.paused && <Chip size="small" label="Pausado" color="warning" />}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {row.perfil}
                          {row.nome ? ` · ${row.nome}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
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
                      </Stack>
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
              gestores.map((gestor) => (
                <Box key={gestor.tenant_id}>
                  <ListItemButton onClick={() => void handleSelectGestor(gestor)}>
                    <Box sx={{ width: '100%' }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
                          {gestor.email}
                        </Typography>
                        {gestor.paused && <Chip size="small" label="Pausado" color="warning" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Org {gestor.org_code} · {gestor.team_count} e-mail(s) na equipe
                      </Typography>
                    </Box>
                  </ListItemButton>
                  <Divider />
                </Box>
              ))
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
