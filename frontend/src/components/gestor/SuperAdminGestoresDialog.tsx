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
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import LoginIcon from '@mui/icons-material/Login'
import GroupsIcon from '@mui/icons-material/Groups'
import {
  adminLoadAppState,
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

function mergeTeamRows(
  fromRpc: GestorTeamEmailRow[],
  fromAppState: GestorTeamEmailRow[],
): GestorTeamEmailRow[] {
  const byEmail = new Map<string, GestorTeamEmailRow>()
  for (const row of [...fromRpc, ...fromAppState]) {
    if (!row.email || row.email === SUPER_ADMIN_EMAIL) continue
    const prev = byEmail.get(row.email)
    if (!prev) {
      byEmail.set(row.email, row)
      continue
    }
    byEmail.set(row.email, {
      ...prev,
      ...row,
      nome: row.nome || prev.nome,
      perfil: row.perfil || prev.perfil,
      paused: prev.paused || row.paused,
      is_gestor: prev.is_gestor || row.is_gestor,
    })
  }
  return Array.from(byEmail.values()).sort((a, b) => {
    if (a.is_gestor !== b.is_gestor) return a.is_gestor ? -1 : 1
    return a.email.localeCompare(b.email)
  })
}

function teamFromAppStateUsuarios(
  gestorEmail: string,
  payload: { usuarios?: Array<{ email?: string | null; perfil?: string; nome?: string; ativo?: boolean }> } | null,
): GestorTeamEmailRow[] {
  const users = payload?.usuarios ?? []
  const rows: GestorTeamEmailRow[] = [
    {
      email: gestorEmail,
      perfil: 'GESTOR',
      nome: 'Gestor',
      paused: false,
      is_gestor: true,
    },
  ]
  for (const u of users) {
    const email = u.email?.trim().toLowerCase() ?? ''
    if (!email || email === SUPER_ADMIN_EMAIL || email === gestorEmail) continue
    if (u.ativo === false) continue
    rows.push({
      email,
      perfil: u.perfil ?? '',
      nome: u.nome ?? '',
      paused: false,
      is_gestor: false,
    })
  }
  return rows
}

export function SuperAdminGestoresDialog({ open, onClose }: SuperAdminGestoresDialogProps) {
  const navigate = useNavigate()
  const { startImpersonation } = useAuth()
  const [loading, setLoading] = useState(false)
  const [teamLoading, setTeamLoading] = useState(false)
  const [enteringEmail, setEnteringEmail] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [teamError, setTeamError] = useState('')
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

  const loadTeam = useCallback(async (gestor: ActiveGestorRow) => {
    setTeamLoading(true)
    setTeamError('')
    try {
      let fromRpc: GestorTeamEmailRow[] = []
      let rpcError = ''
      try {
        fromRpc = await listGestorTeamEmails(gestor.email)
      } catch (e) {
        rpcError = e instanceof Error ? e.message : 'Falha ao listar equipe'
        fromRpc = []
      }

      let fromApp: GestorTeamEmailRow[] = []
      try {
        const state = await adminLoadAppState(gestor.tenant_id)
        fromApp = teamFromAppStateUsuarios(gestor.email, state?.payload ?? null)
        const pausedByEmail = new Map(fromRpc.map((r) => [r.email, r.paused]))
        fromApp = fromApp.map((r) => ({
          ...r,
          paused: pausedByEmail.get(r.email) ?? r.paused,
        }))
      } catch {
        fromApp = []
      }

      const merged = mergeTeamRows(fromRpc, fromApp)
      if (merged.length === 0) {
        if (rpcError) setTeamError(rpcError)
        setTeam([
          {
            email: gestor.email,
            perfil: 'GESTOR',
            nome: 'Gestor',
            paused: gestor.paused,
            is_gestor: true,
          },
        ])
      } else {
        setTeam(
          merged.map((r) =>
            r.email === gestor.email ? { ...r, paused: gestor.paused, is_gestor: true } : r,
          ),
        )
      }
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : 'Não foi possível carregar a equipe')
      setTeam([])
    } finally {
      setTeamLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setSelectedGestor(null)
      setTeam([])
      setError('')
      setTeamError('')
      setEnteringEmail(null)
      return
    }
    void loadGestores()
  }, [open, loadGestores])

  const handleOpenTeam = async (gestor: ActiveGestorRow) => {
    setSelectedGestor(gestor)
    await loadTeam(gestor)
  }

  const handleCloseTeam = () => {
    setSelectedGestor(null)
    setTeam([])
    setTeamError('')
    void loadGestores()
  }

  const handleEnterAs = async (email: string) => {
    setEnteringEmail(email)
    setError('')
    setTeamError('')
    try {
      const result = await startImpersonation(email)
      setSelectedGestor(null)
      onClose()
      navigate(result.route, { replace: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível entrar como este e-mail'
      if (selectedGestor) setTeamError(msg)
      else setError(msg)
    } finally {
      setEnteringEmail(null)
    }
  }

  const handleTogglePause = async (email: string, paused: boolean) => {
    if (email === SUPER_ADMIN_EMAIL) return
    setBusyEmail(email)
    setError('')
    setTeamError('')
    try {
      const next = await setAccountPaused(email, paused)
      setTeam((rows) => rows.map((row) => (row.email === email ? { ...row, paused: next } : row)))
      setGestores((rows) =>
        rows.map((row) => (row.email === email ? { ...row, paused: next } : row)),
      )
      if (selectedGestor?.email === email) {
        setSelectedGestor({ ...selectedGestor, paused: next })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível alterar a pausa'
      if (selectedGestor) setTeamError(msg)
      else setError(msg)
    } finally {
      setBusyEmail(null)
    }
  }

  const teamMembers = team.filter((r) => !r.is_gestor)
  const gestorRow = team.find((r) => r.is_gestor)

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Gestores ativos</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Clique no gestor para ver todos os e-mails cadastrados na equipe. Use Entrar para acessar
            como ele.
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
                          onClick={() => void handleOpenTeam(gestor)}
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
                            <Typography
                              variant="caption"
                              color="primary"
                              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}
                            >
                              <GroupsIcon sx={{ fontSize: 14 }} />
                              Ver equipe
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
                          <Tooltip
                            title={gestor.paused ? 'Conta pausada' : 'Entrar como este gestor'}
                          >
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

      <Dialog
        open={Boolean(selectedGestor)}
        onClose={handleCloseTeam}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Equipe de {selectedGestor?.email ?? ''}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Todos os e-mails cadastrados por este gestor. Use Entrar para abrir o sistema como cada
            perfil.
          </Typography>

          {teamError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {teamError}
            </Alert>
          )}

          {teamLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <List disablePadding>
              {gestorRow && (
                <>
                  <TeamEmailRow
                    row={gestorRow}
                    enteringEmail={enteringEmail}
                    busyEmail={busyEmail}
                    onEnter={handleEnterAs}
                    onTogglePause={handleTogglePause}
                    enterLabel="Entrar como gestor"
                  />
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, px: 0.5 }}>
                    E-mails cadastrados ({teamMembers.length})
                  </Typography>
                </>
              )}

              {teamMembers.length === 0 ? (
                <Typography color="text.secondary" sx={{ px: 0.5 }}>
                  Nenhum e-mail de equipe cadastrado por este gestor.
                </Typography>
              ) : (
                teamMembers.map((row) => (
                  <TeamEmailRow
                    key={row.email}
                    row={row}
                    enteringEmail={enteringEmail}
                    busyEmail={busyEmail}
                    onEnter={handleEnterAs}
                    onTogglePause={handleTogglePause}
                    enterLabel="Entrar"
                  />
                ))
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseTeam}>Voltar</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function TeamEmailRow({
  row,
  enteringEmail,
  busyEmail,
  onEnter,
  onTogglePause,
  enterLabel,
}: {
  row: GestorTeamEmailRow
  enteringEmail: string | null
  busyEmail: string | null
  onEnter: (email: string) => void
  onTogglePause: (email: string, paused: boolean) => void
  enterLabel: string
}) {
  const isSelf = row.email === SUPER_ADMIN_EMAIL
  const entering = enteringEmail === row.email

  return (
    <Box>
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
            <Typography sx={{ fontWeight: 700, wordBreak: 'break-all' }}>{row.email}</Typography>
            {row.is_gestor && <Chip size="small" label="Gestor" color="primary" />}
            {row.paused && <Chip size="small" label="Pausado" color="warning" />}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {row.perfil}
            {row.nome ? ` · ${row.nome}` : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {row.paused ? (
            <PauseCircleIcon fontSize="small" color="warning" />
          ) : (
            <PlayCircleIcon fontSize="small" color="success" />
          )}
          <Switch
            checked={!row.paused}
            disabled={isSelf || busyEmail === row.email}
            onChange={(_, checked) => void onTogglePause(row.email, !checked)}
            slotProps={{
              input: {
                'aria-label': row.paused ? 'Reativar conta' : 'Pausar conta',
              },
            }}
          />
          <Button
            size="small"
            variant="contained"
            startIcon={
              entering ? <CircularProgress size={14} color="inherit" /> : <LoginIcon fontSize="small" />
            }
            disabled={Boolean(enteringEmail) || row.paused || isSelf}
            onClick={() => void onEnter(row.email)}
            sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            {entering ? 'Entrando...' : enterLabel}
          </Button>
        </Box>
      </Box>
      <Divider />
    </Box>
  )
}
